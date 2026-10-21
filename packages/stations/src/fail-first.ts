/**
 * Fail-first: a criterion's test proves something only if it fails on the base code and passes with the
 * change. A test that passes on both would pass even if the change were wrong. The build agent checks
 * itself with this, the build workflow posts it as evidence, and CI runs it again without trusting either.
 */

/** A test that names an acceptance criterion: its title starts with the criterion's id, `AC-3: ...`. */
export type AcTest = { id: string; file: string; kind: "unit" | "e2e" };
/** How a test ended in one run. "not run" means the runner never reached it, which proves nothing. */
export type Outcome = "passed" | "failed" | "not run";
export type Row = AcTest & { base: Outcome; change: Outcome };

const AC_TITLE = /\b(?:it|test)(?:\.only)?\(\s*["'`](AC-\d+)\b/g;
const AC_ID = /^(AC-\d+)\b/;

/** The criteria a test file names, in the order they appear. */
export function acTestsIn(file: string, source: string): AcTest[] {
  const kind = /\.spec\.tsx?$/.test(file) ? "e2e" : "unit";
  return [...source.matchAll(AC_TITLE)].map((m) => ({ id: m[1], file, kind }));
}

type VitestReport = { testResults: { name: string; status: string; assertionResults: { title: string; status: string }[] }[] };
type Attachment = { name: string; path?: string };
type PlaywrightSpec = { title: string; ok: boolean; tests?: { projectName: string; results: { attachments?: Attachment[] }[] }[] };
export type PlaywrightSuite = { title: string; specs?: PlaywrightSpec[]; suites?: PlaywrightSuite[] };

const specsOf = (suites: PlaywrightSuite[]): PlaywrightSpec[] => suites.flatMap((s) => [...(s.specs ?? []), ...specsOf(s.suites ?? [])]);

/**
 * Outcomes by criterion from Vitest's JSON report. A file that failed to load (it imports what the base
 * code does not have yet) fails every criterion it names: that is a red test too.
 */
export function vitestOutcomes(report: VitestReport, tests: AcTest[]): Map<string, Outcome> {
  const outcomes = new Map<string, Outcome>();
  for (const file of report.testResults) {
    for (const a of file.assertionResults) {
      const id = AC_ID.exec(a.title)?.[1];
      if (id) outcomes.set(id, a.status === "passed" ? "passed" : "failed");
    }
    if (file.status === "failed" && file.assertionResults.length === 0)
      for (const t of tests) if (file.name.endsWith(`/${t.file}`) && !outcomes.has(t.id)) outcomes.set(t.id, "failed");
  }
  return outcomes;
}

/** Outcomes by criterion from Playwright's JSON report: a spec fails if it failed in any project. */
export function playwrightOutcomes(report: { suites: PlaywrightSuite[] }): Map<string, Outcome> {
  const outcomes = new Map<string, Outcome>();
  for (const spec of specsOf(report.suites)) {
    const id = AC_ID.exec(spec.title)?.[1];
    if (id && outcomes.get(id) !== "failed") outcomes.set(id, spec.ok ? "passed" : "failed");
  }
  return outcomes;
}

/** A screenshot a criterion's e2e test left as it ended, in one Playwright project (a browser and a screen). */
export type Shot = { id: string; project: string; path: string };

export function screenshotsIn(report: { suites: PlaywrightSuite[] }): Shot[] {
  return specsOf(report.suites).flatMap((spec) => {
    const id = AC_ID.exec(spec.title)?.[1];
    if (!id) return [];
    return (spec.tests ?? []).flatMap((t) =>
      t.results.flatMap((r) => (r.attachments ?? []).filter((a) => a.name === "screenshot" && a.path).map((a) => ({ id, project: t.projectName, path: a.path! }))),
    );
  });
}

/** Every criterion's test, red on the base code and green with the change, and every criterion tested. */
export function judge(
  tests: AcTest[],
  base: Map<string, Outcome>,
  change: Map<string, Outcome>,
  criteria?: { id: string; test: "unit" | "e2e" }[],
): { rows: Row[]; problems: string[] } {
  const rows = tests.map((t) => ({ ...t, base: base.get(t.id) ?? "not run", change: change.get(t.id) ?? "not run" }));
  const problems: string[] = [];
  if (!rows.length) problems.push("No test names a criterion: each criterion's test title starts with its id, as in `AC-1: ...`.");
  for (const r of rows) {
    if (r.change !== "passed") problems.push(`${r.id} ${r.change === "failed" ? "fails" : "did not run"} with the change.`);
    if (r.base === "passed") problems.push(`${r.id} passes on the base code too: it would pass even if the change were wrong.`);
    if (r.base === "not run") problems.push(`${r.id} did not run on the base code, so nothing shows it can fail.`);
  }
  for (const c of criteria ?? []) {
    const found = rows.filter((r) => r.id === c.id);
    if (!found.length) problems.push(`${c.id} has no test.`);
    else if (!found.some((r) => r.kind === c.test)) problems.push(`${c.id} is a ${c.test} criterion, but its test is not.`);
  }
  return { rows, problems };
}

/** What goes on the PR: the fail-first table, then each e2e criterion's screenshots, named `AC-3-desktop.png`. */
export function evidenceMarkdown(result: { rows: Row[]; problems: string[] }, shots: Pick<Shot, "id" | "project">[], imagesUrl = ""): string {
  const ids = [...new Set(shots.map((s) => s.id))];
  const images = ids.map(
    (id) => `**${id}**\n\n${shots.filter((s) => s.id === id).map((s) => `![${id} on ${s.project}](${imagesUrl}${id}-${s.project}.png)`).join(" ")}`,
  );
  return `${failFirstTable(result)}${images.length ? `\n#### Screenshots, with the change\n\n${images.join("\n\n")}\n` : ""}`;
}

const shown: Record<Outcome, string> = { passed: "✅ passed", failed: "❌ failed", "not run": "⚠️ did not run" };

/** The table for the PR: what each criterion's test did on the base code and with the change. */
export function failFirstTable({ rows, problems }: { rows: Row[]; problems: string[] }): string {
  const lines = [
    "| Criterion | Test | Base code | With the change |",
    "|---|---|---|---|",
    ...rows.map((r) => `| ${r.id} | ${r.kind} · \`${r.file}\` | ${shown[r.base]} | ${shown[r.change]} |`),
  ];
  return `${lines.join("\n")}\n\n${problems.length ? problems.map((p) => `- ${p}`).join("\n") : "Every criterion's test fails on the base code and passes with the change."}\n`;
}
