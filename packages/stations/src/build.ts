import * as adf from "./adf.ts";
import { STATUS } from "./board.ts";
import type { GitHub, RunIssue } from "./github.ts";
import type { Jira } from "./jira.ts";
import { readSpecComment, type Envelope } from "./render.ts";

export type BuildRecord = Pick<GitHub, "issue" | "comments" | "comment" | "relabel">;
export type BuildBoard = Pick<Jira, "cardUrl" | "move" | "comment" | "link" | "assign">;
/** Pull requests go through the factory's App, so the gates run on them; GITHUB_TOKEN's events start none. */
export type Pulls = Pick<GitHub, "pulls" | "openPull">;
/** The two pushes the factory makes after the agent: the change on its branch, the evidence on `evidence`. */
export type Push = { change(branch: string, message: string): Promise<void>; evidence(folder: string): Promise<void> };

const BOT = "github-actions[bot]";
const SPEC_MARKER = "<!-- factory:spec v1";
const HOTEL = "apps/hotel/";
const note = (...parts: (adf.Inline | adf.Inline[])[]) => adf.doc(adf.paragraph(...parts));

/** The branch a run's change goes on, as in `run/16-total-price-of-a-stay`. */
export function branchFor(run: Pick<RunIssue, "number" | "title">): string {
  const words = run.title.replace(/^[A-Z][A-Z0-9]*-\d+: /, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  // The leading words that fit in 40 characters, whole.
  let slug = words[0] ?? "";
  for (const word of words.slice(1)) {
    if (`${slug}-${word}`.length > 40) break;
    slug = `${slug}-${word}`;
  }
  return `run/${run.number}-${slug}`;
}

export type Prepared = { go: true; run: RunIssue; envelope: Envelope; sha256: string; branch: string } | { go: false; reason: string };

/**
 * Whether a run is ready to build, and from what: an open run at the build station, not waiting on a person,
 * whose last spec on the issue is intact and approved for its exact hash, and with no PR yet. Board starts
 * the build after every approval it sees, even twice, so this is what makes a run build once.
 */
export async function prepareBuild(record: BuildRecord, pulls: Pick<Pulls, "pulls">, number: number): Promise<Prepared> {
  const run = await record.issue(number);
  if (!run.open || !run.labels.includes("run")) return { go: false, reason: `#${number} is not an open run.` };
  if (!run.labels.includes("station:build")) return { go: false, reason: `#${number} is not at the build station.` };
  if (run.labels.includes("escalated")) return { go: false, reason: `#${number} waits for a person.` };
  const comments = await record.comments(number);
  const posted = comments.filter((c) => c.author === BOT && c.body.includes(SPEC_MARKER)).at(-1);
  const read = posted ? readSpecComment(posted.body) : ({ ok: false, reason: "it has no spec" } as const);
  if (!read.ok) return { go: false, reason: `#${number} cannot be built: ${read.reason}.` };
  if (!comments.some((c) => c.author === BOT && c.body.includes(`<!-- factory:approved sha256=${read.sha256} `)))
    return { go: false, reason: `#${number} cannot be built: its spec is not approved for its hash.` };
  const branch = branchFor(run);
  const open = await pulls.pulls(branch);
  if (open.length) return { go: false, reason: `#${number} already has PR #${open[0].number}.` };
  return { go: true, run, envelope: read.envelope, sha256: read.sha256, branch };
}

/**
 * What the build left: whether the agent finished, the files it changed, its question if it stopped, and
 * the factory's evidence.
 */
export type Built = { finished: boolean; changed: string[]; blocked?: string; evidence: { ok: boolean; problems: string[]; markdown: string } };

/**
 * The files `git status --porcelain --untracked-files=all` lists, renames by their new name. Each line is a
 * two-letter status, a space and the path; the status of a modified tracked file starts with a space.
 */
export function changedFiles(porcelain: string): string[] {
  return porcelain
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3).split(" -> ").at(-1)!);
}

/**
 * What a failed git command says, for a comment people read: git's own error lines, never the command. The
 * command holds the push URL with the App's token, and Node puts it in the error's message.
 */
export function gitFailure(error: unknown, secret: string): string {
  const stderr = String((error as { stderr?: unknown })?.stderr ?? "");
  const lines = stderr.split("\n").filter((l) => /^( ! |fatal:|error:|CONFLICT)/.test(l));
  const said = (lines.length ? lines : ["git failed with no message"]).join("\n").trim();
  return secret ? said.replaceAll(secret, "***") : said;
}

/** Whether to publish what the build left, and as what. Only a change inside the hotel ever reaches a PR. */
export function judgeBuild(built: Built): { publish: false; reason: string } | { publish: true; draft: boolean; reason?: string } {
  if (built.blocked?.trim()) return { publish: false, reason: `the build agent stopped and asks:\n\n${built.blocked.trim()}` };
  if (!built.finished) return { publish: false, reason: "the build agent did not finish (its step failed or ran out of turns). Nothing was published." };
  const outside = built.changed.filter((f) => !f.startsWith(HOTEL));
  if (outside.length) return { publish: false, reason: `the build changed files outside ${HOTEL}, which only the factory changes: ${outside.join(", ")}. Nothing was published.` };
  if (!built.changed.length) return { publish: false, reason: `the build agent left no change in ${HOTEL}.` };
  if (!built.evidence.ok) return { publish: true, draft: true, reason: `the evidence is not green, so the PR is a draft:\n${built.evidence.problems.map((p) => `- ${p}`).join("\n")}` };
  return { publish: true, draft: false };
}

/**
 * Publishes a build, or hands it to a person. Run by the workflow after the agent, never by it: the agent's
 * token cannot push, and what it claims is not what goes on the PR. The factory's own evidence run is.
 */
export async function publishBuild(
  d: { record: BuildRecord; board: BuildBoard; pulls: Pulls; push: Push; runUrl: string; maintainer?: string; log?: (line: string) => void },
  { run, branch, sha256, built }: { run: RunIssue; branch: string; sha256: string; built: Built },
): Promise<void> {
  const verdict = judgeBuild(built);
  const card = run.key;
  const ask = async (reason: string) => {
    await d.record.comment(run.number, `The build needs a person: ${reason}\n\n[Workflow run](${d.runUrl})`);
    await d.record.relabel(run.number, { add: ["escalated"] });
    if (card) await d.board.comment(card, note(adf.text(`The build needs a person: ${reason} `), adf.link("Workflow run", d.runUrl)));
    if (card && d.maintainer) await d.board.assign(card, d.maintainer);
    d.log?.(`run #${run.number}: escalated (${reason.split("\n")[0]})`);
  };
  if (!verdict.publish) return ask(verdict.reason);

  try {
    await d.push.change(branch, `${run.title}\n\nRun #${run.number}, built from the spec with sha256 ${sha256}.`);
    await d.push.evidence(`run-${run.number}`);
  } catch (error) {
    return ask(`publishing the change failed, so nothing was published:\n\n${error instanceof Error ? error.message : String(error)}`);
  }
  const cardLink = card ? ` · [${card}](${d.board.cardUrl(card)})` : "";
  const pr = await d.pulls.openPull({
    title: run.title,
    branch,
    draft: verdict.draft,
    body:
      `Run [#${run.number}](${run.url})${cardLink} · spec sha256 \`${sha256.slice(0, 12)}\`\n\n## Evidence\n\n${built.evidence.markdown}\n` +
      `<sub>The factory's own run of the evidence, after the build agent finished. CI checks the change again on its own. [Workflow run](${d.runUrl})</sub>\n`,
  });
  await d.record.comment(run.number, `Built: PR #${pr.number}${verdict.draft ? ", a draft" : ""}. Next station: gates.`);
  await d.record.relabel(run.number, { add: ["station:gates"], remove: ["station:build"] });
  if (card) {
    await d.board.move(card, STATUS.gates);
    await d.board.link(card, pr.url, `PR #${pr.number} on GitHub`);
    await d.board.comment(card, note(adf.text(`Built: `), adf.link(`PR #${pr.number}`, pr.url), adf.text(", with each criterion's evidence. Next station: gates.")));
  }
  d.log?.(`run #${run.number}: PR #${pr.number} opened${verdict.draft ? " as a draft" : ""}`);
  if (verdict.reason) await ask(verdict.reason);
}
