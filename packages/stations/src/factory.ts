import * as adf from "./adf.ts";
import { decide, gatesOf, GATES, STATUS, stationOf, type Action, type BoardState, type Observed, type Run, type RunPull } from "./board.ts";
import { branchFor } from "./build.ts";
import type { GitHub } from "./github.ts";
import { HttpError } from "./http.ts";
import type { Jira } from "./jira.ts";
import { readOwnWrites } from "./own-writes.ts";
import { readSpecComment, SHOWN_SHA, specAdf, specHash, type Envelope } from "./render.ts";
import { runSpecStation, StationError, type ModelCall } from "./spec-station.ts";
import { listTicketIds, loadTicket, type Ticket } from "./tickets.ts";

export type BoardApi = Pick<Jira, "cardUrl" | "me" | "card" | "search" | "moves" | "move" | "comment" | "comments" | "link" | "assign">;
export type RecordApi = Pick<GitHub, "runs" | "create" | "comment" | "comments" | "relabel" | "close" | "dispatch" | "pull" | "checks">;

/** Everything the factory works with. Tests pass fakes for the board, the record and the model. */
export type Factory = {
  root: string;
  project: string;
  board: BoardApi;
  record: RecordApi;
  call: ModelCall;
  /** The workflow run doing this work, linked from what the factory writes. */
  runUrl: string;
  /** The Maintainer's Jira account: a card that needs a person is assigned to it, so Jira tells them. */
  maintainer?: string;
  now?: () => Date;
  log?: (line: string) => void;
};

const SPEC_MARKER = "<!-- factory:spec v1";
const BOT = "github-actions[bot]";
const PASSES = 5;

const note = (...parts: (adf.Inline | adf.Inline[])[]) => adf.doc(adf.paragraph(...parts));

/**
 * Hands a card to the Maintainer: Jira tells them, and the board shows who the factory waits for. A notice that
 * fails is logged and the run goes on: the comments on the card still say what waits.
 */
async function askMaintainer(f: Factory, key: string): Promise<void> {
  if (!f.maintainer) return;
  try {
    await f.board.assign(key, f.maintainer);
  } catch (error) {
    f.log?.(`${key}: could not assign the card to the Maintainer (${describeFailure(error)})`);
  }
}

/** Whether the run issue already says this step happened: GitHub's list may still show the run from before it. */
async function done(f: Factory, run: number, marker: string): Promise<boolean> {
  return (await f.record.comments(run)).some((c) => c.author === BOT && c.body.includes(marker));
}

/** A failure as a person reads it: our own messages as they are, anything unexpected summarised. */
export function describeFailure(error: unknown): string {
  if (error instanceof StationError || error instanceof HttpError) return error.message;
  return "The station failed in an unexpected way; the workflow log has the details.";
}

/** What the board and GitHub show now: the open runs and every card that is not in Backlog or Done. */
export async function observe(f: Factory, factory: string, hint?: string): Promise<BoardState> {
  const since = new Date((f.now?.() ?? new Date()).getTime() - 24 * 3600 * 1000).toISOString();
  const [open, recent, listed] = await Promise.all([
    f.record.runs({ open: true }),
    f.record.runs({ since }),
    f.board.search(`project = "${f.project}" AND status NOT IN ("${STATUS.backlog}", "${STATUS.done}") ORDER BY created ASC`),
  ]);
  const runs: Run[] = open.filter((r) => r.key).map((r) => ({ ...r, station: stationOf(r.labels) }));
  // JQL search is not read-after-write consistent, so it only names the cards, and it may miss the card
  // whose change woke the factory: each one is read again on its own, which is. The cards of the open
  // runs are read wherever they are.
  const withRun = new Set(runs.map((r) => r.key!));
  const woke = hint && new RegExp(`^${f.project}-\\d+$`).test(hint) ? [hint] : [];
  const keys = [...new Set([...listed.map((c) => c.key), ...withRun, ...woke])];
  const read = async (key: string): Promise<Observed | null> => {
    const card = await f.board.card(key);
    const active = card && (withRun.has(key) || (card.status !== STATUS.backlog && card.status !== STATUS.done));
    return active ? { ...card, moves: await f.board.moves(key) } : null;
  };
  const cards = (await Promise.all(keys.map(read))).filter((c): c is Observed => c !== null);
  // A run past the build has a PR: whether it is merged, and its gates, decide where the run goes next.
  const pulls: Record<number, RunPull> = {};
  for (const run of runs.filter((r) => r.station === "station:gates" || r.station === "station:maintainer")) {
    const pull = await f.record.pull(branchFor(run));
    if (pull) pulls[run.number] = { ...pull, gates: pull.state === "open" ? gatesOf(await f.record.checks(pull.sha)) : { state: "pending", failed: [] } };
  }
  return { runs, cards, factory, runsLast24h: recent.length, ticketIds: listTicketIds(f.root), hint, pulls };
}

/**
 * Brings the board and GitHub into line: looks, decides, acts, and looks again until nothing is left
 * to do. Returns the specs it wrote, for the run ledger.
 */
export async function reconcile(f: Factory, hint?: string): Promise<Envelope[]> {
  // The next look must see what this one did, though GitHub's issue list may not show it yet.
  f = { ...f, record: readOwnWrites(f.record) };
  const me = await f.board.me();
  const specs: Envelope[] = [];
  const errors: unknown[] = [];
  for (let pass = 0; pass < PASSES; pass++) {
    const actions = decide(await observe(f, me.accountId, pass === 0 ? hint : undefined));
    for (const action of actions) {
      try {
        const spec = await act(f, me.accountId, action);
        if (spec) specs.push(spec);
      } catch (error) {
        f.log?.(`${action.kind} ${"card" in action && action.card ? action.card.key : ""} failed: ${String(error)}`);
        errors.push(error);
      }
    }
    if (!actions.some((a) => a.kind !== "note")) break;
  }
  if (errors.length) throw errors[0];
  return specs;
}

async function act(f: Factory, factory: string, action: Action): Promise<Envelope | undefined> {
  switch (action.kind) {
    case "take":
      return take(f, action.card, action.ticketId);
    case "approve":
      return approve(f, factory, action.run, action.card, action.by.byName, action.by.by);
    case "reject":
      return reject(f, action.run, action.card, action.by.byName);
    case "fail":
      return fail(f, action.run, action.card, action.reason);
    case "gatesPassed":
      return gatesPassed(f, action.run, action.card, action.pull);
    case "gatesFailed":
      return gatesFailed(f, action.run, action.card, action.pull);
    case "merged":
      return merged(f, action.run, action.card, action.pull);
    case "restore": {
      const move = action.card.moves.at(-1);
      const who = move ? `${move.byName} moved this card to ${action.card.status}. ` : "";
      f.log?.(`${action.card.key}: back to ${action.to}`);
      await f.board.move(action.card.key, action.to);
      await f.board.comment(action.card.key, note(adf.text(`${who}${action.reason}`)));
      return;
    }
    case "note":
      f.log?.(`${action.card.key}: ${action.reason}`);
      await f.board.comment(action.card.key, note(adf.text(action.reason)));
      return;
  }
}

function runBody(ticket: Ticket, card: Observed, cardUrl: string, runUrl: string): string {
  const mover = card.moves.filter((m) => m.to === STATUS.ready).at(-1)?.byName;
  return (
    `${ticket.body}\n\n---\n` +
    `<sub>Taken from the board: [${card.key}](${cardUrl})${mover ? `, moved to Ready by ${mover}` : ""}. ` +
    `Ticket text: \`tickets/${ticket.id}.md\` (the copy on the board never reaches an agent). [Workflow run](${runUrl}).</sub>\n`
  );
}

/**
 * Takes a card from Ready: opens its run and writes the spec. The spec gate then approves a clear spec,
 * which goes on to Build, or sends one the ticket left too open to a person in Spec review.
 */
async function take(f: Factory, card: Observed, ticketId: string): Promise<Envelope | undefined> {
  const ticket = loadTicket(f.root, ticketId);
  const issue = await f.record.create({
    title: `${card.key}: ${ticket.title}`,
    body: runBody(ticket, card, f.board.cardUrl(card.key), f.runUrl),
    labels: ["run", `ticket:${ticket.id}`, "station:spec"],
  });
  f.log?.(`${card.key}: run #${issue.number} opened`);
  // From here on the run exists, so whatever stops it (the model, Jira, GitHub) ends it with a reason.
  let station = "station:spec";
  let envelope: Envelope | undefined;
  try {
    await f.board.move(card.key, STATUS.spec);
    await f.board.link(card.key, issue.url, `Run #${issue.number} on GitHub`);
    const result = await runSpecStation({ root: f.root, ticketId: ticket.id, issue: issue.number, card: card.key, call: f.call });
    const escalated = result.soft.length > 0;
    await f.record.comment(issue.number, result.comment);
    await f.board.comment(card.key, specAdf(result.envelope, issue, { escalated }));
    f.log?.(`${card.key}: spec posted, $${result.envelope.meta.costUsd.toFixed(3)}`);
    if (escalated) {
      const reasons = result.soft.join("; ");
      await f.record.relabel(issue.number, { add: ["station:spec-approval"], remove: [station] });
      station = "station:spec-approval";
      await f.board.move(card.key, STATUS.specReview);
      await f.record.comment(issue.number, `The spec gate needs a person: ${reasons}. Move ${card.key} to Build to approve the spec as it is, or to Done to reject it.`);
      await f.board.comment(card.key, note(adf.text(`The spec gate needs a person: ${reasons}. Move the card to Build to approve the spec as it is, or to Done to reject it.`)));
      await askMaintainer(f, card.key);
      f.log?.(`${card.key}: spec sent to a person (${reasons})`);
    } else {
      const sha = specHash(result.envelope);
      await f.record.comment(
        issue.number,
        `Spec approved by the spec gate, sha256 \`${sha.slice(0, 12)}\`. Next station: build.\n<!-- factory:approved sha256=${sha} by=gate:spec -->`,
      );
      await f.record.relabel(issue.number, { add: ["station:build"], remove: [station] });
      station = "station:build";
      await f.board.move(card.key, STATUS.build);
      await f.board.comment(card.key, note(adf.text("Spec approved by the spec gate (sha256 "), adf.code(sha.slice(0, 12)), adf.text("). Next station: build.")));
      f.log?.(`${card.key}: spec approved by the spec gate`);
    }
    envelope = result.envelope;
  } catch (error) {
    if (!(error instanceof StationError)) console.error(error);
    await fail(f, { ...issue, station }, card, describeFailure(error));
    return;
  }
  // Outside the run's failure path: the spec stays approved even if the build does not start.
  if (station === "station:build") await startBuild(f, issue.number);
  return envelope;
}

/**
 * Starts the build station for a run whose spec is approved. The build starts once per run however often
 * it is asked (it checks the run first), so a look that sees the approval again may ask again.
 */
async function startBuild(f: Factory, run: number): Promise<void> {
  await f.record.dispatch("build.yml", { run: String(run) });
  f.log?.(`run #${run}: build started`);
}

/** Ends a run that failed, on both sides, with a reason a person can act on. */
async function fail(f: Factory, run: Run, card: Observed | null, reason: string): Promise<undefined> {
  // The marker goes last, so a failure on the way is done again on the next look, and the next look of a
  // process that gets GitHub's list from before the close does nothing twice.
  const marker = "<!-- factory:failed -->";
  if (!(await done(f, run.number, marker))) {
    f.log?.(`run #${run.number} failed: ${reason}`);
    if (card) {
      await f.board.comment(card.key, note(adf.text(`Run #${run.number} stopped: ${reason} `), adf.link("Workflow run", f.runUrl)));
      if (card.status !== STATUS.done) await f.board.move(card.key, STATUS.done);
      await askMaintainer(f, card.key);
    }
    await f.record.comment(run.number, `The run stops here.\n\n${reason}\n\n[Workflow run](${f.runUrl})\n${marker}`);
  }
  await f.record.relabel(run.number, { add: ["outcome:failed"], remove: run.station ? [run.station] : [] });
  await f.record.close(run.number, "not_planned");
}

/** The PR passed every gate: it waits for the Maintainer, who reviews the evidence and merges. */
async function gatesPassed(f: Factory, run: Run, card: Observed, pull: RunPull): Promise<undefined> {
  const marker = `<!-- factory:gates-passed pr=${pull.number} -->`;
  // The marker goes last: if the move fails, the next look moves the card and assigns the Maintainer again.
  if (!(await done(f, run.number, marker))) {
    await f.board.move(card.key, STATUS.merge);
    await f.board.comment(card.key, note(adf.text("Every gate passed. The Maintainer reviews the evidence on "), adf.link(`PR #${pull.number}`, pull.url), adf.text(" and merges it to production.")));
    await askMaintainer(f, card.key);
    await f.record.comment(run.number, `PR #${pull.number} passed the gates: ${GATES.join("; ")}. Next: the Maintainer reviews and merges it.\n${marker}`);
    f.log?.(`${card.key}: gates passed on PR #${pull.number}, waiting for the Maintainer`);
  }
  await f.record.relabel(run.number, { add: ["station:maintainer"], remove: ["station:gates"] });
}

/** A gate failed on the PR: the run waits for a person, with the card in Gates. Retries come with self-healing. */
async function gatesFailed(f: Factory, run: Run, card: Observed, pull: RunPull): Promise<undefined> {
  const marker = `<!-- factory:gates-failed pr=${pull.number} -->`;
  const failed = pull.gates.failed.join("; ");
  if (!(await done(f, run.number, marker))) {
    await f.board.comment(card.key, note(adf.text(`The gates need a person: ${failed} failed on `), adf.link(`PR #${pull.number}`, pull.url), adf.text(".")));
    await askMaintainer(f, card.key);
    await f.record.comment(run.number, `The gates need a person: ${failed} failed on PR #${pull.number}.\n${marker}`);
    f.log?.(`${card.key}: gates failed on PR #${pull.number} (${failed})`);
  }
  await f.record.relabel(run.number, { add: ["escalated"] });
}

/** The Maintainer merged the PR: the run is done, and production deploys from main. */
async function merged(f: Factory, run: Run, card: Observed, pull: RunPull): Promise<undefined> {
  const marker = `<!-- factory:merged pr=${pull.number} -->`;
  if (!(await done(f, run.number, marker))) {
    await f.board.comment(card.key, note(adf.link(`PR #${pull.number}`, pull.url), adf.text(" was merged. The change goes to production from main.")));
    await f.record.comment(run.number, `PR #${pull.number} was merged. The run is done; production deploys from main.\n${marker}`);
    f.log?.(`${card.key}: PR #${pull.number} merged, run #${run.number} done`);
  }
  await f.record.relabel(run.number, { add: ["outcome:merged"], remove: run.station ? [run.station] : [] });
  await f.record.close(run.number, "completed");
  if (card.status !== STATUS.done) await f.board.move(card.key, STATUS.done);
}

/**
 * Approves a spec moved to Build. It counts only if the run issue holds an unchanged spec and the
 * card shows that same spec, as the factory posted it: the product owner approves what they read.
 */
async function approve(f: Factory, factory: string, run: Run, card: Observed, who: string, accountId: string): Promise<undefined> {
  const comments = await f.record.comments(run.number);
  const posted = comments.filter((c) => c.author === BOT && c.body.includes(SPEC_MARKER)).at(-1);
  const read = posted ? readSpecComment(posted.body) : ({ ok: false, reason: "the run issue has no spec" } as const);
  let problem = read.ok ? undefined : read.reason;
  if (read.ok) {
    const shown = (await f.board.comments(card.key)).filter((c) => c.author === factory && SHOWN_SHA.test(c.text)).at(-1);
    if (!shown) problem = "the card does not show the spec";
    else if (shown.updated !== shown.created) problem = "the spec on the card was edited after the factory posted it";
    else if (SHOWN_SHA.exec(shown.text)?.[1] !== read.sha256) problem = "the spec on the card is not the one on the run issue";
  }
  if (problem || !read.ok) {
    f.log?.(`${card.key}: approval refused (${problem})`);
    await f.record.comment(run.number, `${who} moved ${card.key} to Build on the board, but the approval did not count: ${problem}.`);
    await f.board.move(card.key, STATUS.specReview);
    await f.board.comment(card.key, note(adf.text(`The approval did not count: ${problem}. The card goes back to Spec review.`)));
    return;
  }
  const sha = read.sha256;
  // A later look may still get the run from GitHub's list as it was before this approval: it counts once.
  if (comments.some((c) => c.author === BOT && c.body.includes(`<!-- factory:approved sha256=${sha} `))) {
    await f.record.relabel(run.number, { add: ["station:build"], remove: ["station:spec-approval"] });
    await startBuild(f, run.number);
    return;
  }
  await f.record.comment(
    run.number,
    `Spec approved by ${who} on the board ([${card.key}](${f.board.cardUrl(card.key)})), sha256 \`${sha.slice(0, 12)}\`. Next station: build.\n` +
      `<!-- factory:approved sha256=${sha} by=jira:${accountId} -->`,
  );
  await f.record.relabel(run.number, { add: ["station:build"], remove: ["station:spec-approval"] });
  await f.board.comment(card.key, note(adf.text(`Spec approved by ${who} (sha256 `), adf.code(sha.slice(0, 12)), adf.text("). Next station: build.")));
  f.log?.(`${card.key}: spec approved by ${who}`);
  await startBuild(f, run.number);
}

async function reject(f: Factory, run: Run, card: Observed, who: string): Promise<undefined> {
  await f.record.comment(run.number, `Spec rejected by ${who} on the board ([${card.key}](${f.board.cardUrl(card.key)})). The run ends here; nothing was built.`);
  await f.record.relabel(run.number, { add: ["outcome:rejected"], remove: ["station:spec-approval"] });
  await f.record.close(run.number, "not_planned");
  await f.board.comment(card.key, note(adf.text(`Spec rejected by ${who}. Run #${run.number} ends here; nothing was built.`)));
  f.log?.(`${card.key}: spec rejected by ${who}`);
}
