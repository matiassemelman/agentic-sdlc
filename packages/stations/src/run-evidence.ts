// A change's evidence: fail-first for every criterion's test, and a screenshot of every e2e criterion.
//   node packages/stations/src/run-evidence.ts [--base origin/main] [--spec envelope.json] [--out evidence] [--images-url <url>/]
// The change is everything under apps/hotel that differs from the base, committed or not. The base run
// gets the change's tests on the base code. Exits 1 when a criterion's test is not red on the base code
// and green with the change, or when a criterion of the spec has no test.
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  acTestsIn,
  evidenceMarkdown,
  judge,
  playwrightOutcomes,
  screenshotsIn,
  vitestOutcomes,
  type AcTest,
  type Outcome,
  type Shot,
} from "./fail-first.ts";

const { values } = parseArgs({
  options: {
    base: { type: "string", default: "origin/main" },
    spec: { type: "string" },
    out: { type: "string", default: "evidence" },
    "images-url": { type: "string", default: "" },
  },
});
const root = resolve(import.meta.dirname, "../../..");
const HOTEL = "apps/hotel/";
const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

const changed = [
  ...new Set([...git(root, "diff", "--name-only", values.base, "--", HOTEL).split("\n"), ...git(root, "ls-files", "--others", "--exclude-standard", "--", HOTEL).split("\n")]),
].filter((f) => f && existsSync(join(root, f)));
const testFiles = changed.filter((f) => /\.test\.tsx?$/.test(f) || /^apps\/hotel\/e2e\/.+\.spec\.ts$/.test(f));
const tests: AcTest[] = testFiles.flatMap((f) => acTestsIn(f, readFileSync(join(root, f), "utf8")));
const spec = values.spec ? JSON.parse(readFileSync(values.spec, "utf8")) : undefined;
const criteria: { id: string; test: "unit" | "e2e" }[] | undefined = (spec?.spec ?? spec)?.criteria;

const tmp = mkdtempSync(join(tmpdir(), "evidence-"));
const filesOf = (kind: AcTest["kind"]) => [...new Set(tests.filter((t) => t.kind === kind).map((t) => t.file))];
const units = filesOf("unit");
const e2es = filesOf("e2e");

function unitOutcomes(dir: string, label: string): Map<string, Outcome> {
  if (!units.length) return new Map();
  const report = join(tmp, `vitest-${label}.json`);
  const files = units.map((f) => f.slice(HOTEL.length));
  spawnSync("pnpm", ["exec", "vitest", "run", ...files, "--reporter=json", `--outputFile=${report}`], { cwd: join(dir, HOTEL), stdio: "inherit" });
  if (!existsSync(report)) throw new Error(`Vitest wrote no report on the ${label}.`);
  return vitestOutcomes(JSON.parse(readFileSync(report, "utf8")), tests);
}

/** On the base code, one browser is enough to see red; with the change, a desktop and a 375px phone, for the screenshots. */
function e2eRun(dir: string, label: string, projects: string[], extra: string[] = []): { outcomes: Map<string, Outcome>; shots: Shot[] } {
  if (!e2es.length) return { outcomes: new Map(), shots: [] };
  const report = join(tmp, `playwright-${label}.json`);
  const files = e2es.map((f) => f.slice(HOTEL.length));
  spawnSync("pnpm", ["exec", "playwright", "test", ...files, ...projects.flatMap((p) => ["--project", p]), "--grep", "AC-\\d+", "--reporter=json", ...extra], {
    cwd: join(dir, HOTEL),
    stdio: "inherit",
    env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: report, EVIDENCE: "1" },
  });
  if (!existsSync(report)) throw new Error(`Playwright wrote no report on the ${label}.`);
  const parsed = JSON.parse(readFileSync(report, "utf8"));
  return { outcomes: playwrightOutcomes(parsed), shots: screenshotsIn(parsed) };
}

const merge = (...maps: Map<string, Outcome>[]) => new Map(maps.flatMap((m) => [...m]));
let base = new Map<string, Outcome>();
let change = new Map<string, Outcome>();
let shots: Shot[] = [];
if (tests.length) {
  const baseDir = join(tmp, "base");
  git(root, "worktree", "add", "--detach", baseDir, values.base);
  const copyIn = (files: string[]) =>
    files.forEach((f) => {
      mkdirSync(dirname(join(baseDir, f)), { recursive: true });
      cpSync(join(root, f), join(baseDir, f));
    });
  try {
    execFileSync("pnpm", ["install", "--frozen-lockfile", "--prefer-offline", "--filter", "hotel"], { cwd: baseDir, stdio: "inherit" });
    copyIn(units);
    const baseUnits = unitOutcomes(baseDir, "base");
    // `next build` type-checks every file, so unit tests that import what only the change adds would stop the
    // base build for the e2e run: the base code goes back to as it was before the e2e tests come in.
    git(baseDir, "checkout", "--", ".");
    git(baseDir, "clean", "-fdq", "--", HOTEL);
    copyIn(e2es);
    // On the base each criterion's test is meant to fail, and CI's retry ran every failure twice, each one waiting
    // out its timeout. The timeout stays: a shorter one could turn a hollow test red here and let it through.
    base = merge(baseUnits, e2eRun(baseDir, "base", ["desktop"], ["--retries=0"]).outcomes);
  } finally {
    git(root, "worktree", "remove", "--force", baseDir);
  }
  const withChange = e2eRun(root, "change", ["desktop", "small-iphone"]);
  change = merge(unitOutcomes(root, "change"), withChange.outcomes);
  shots = withChange.shots;
}

const result = judge(tests, base, change, criteria);
const out = resolve(values.out);
mkdirSync(out, { recursive: true });
for (const shot of shots) copyFileSync(shot.path, join(out, `${shot.id}-${shot.project}.png`));
rmSync(tmp, { recursive: true, force: true });
writeFileSync(join(out, "evidence.json"), `${JSON.stringify({ ...result, screenshots: shots.map(({ id, project }) => ({ id, project })) }, null, 2)}\n`);
writeFileSync(join(out, "evidence.md"), evidenceMarkdown(result, shots, values["images-url"]));
console.log(`\n${evidenceMarkdown(result, shots)}`);
process.exit(result.problems.length ? 1 : 0);
