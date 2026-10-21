// The build station's two steps around the agent, as build.yml runs them:
//   node packages/stations/src/run-build.ts prepare --run 16   # .factory/envelope.json; outputs go, branch
//   node packages/stations/src/run-build.ts publish --run 16   # what the agent left → a PR, or a person
// Publish reads what the agent left (git status), .factory/blocked.md and the factory's own evidence/, then
// pushes and opens the PR with the factory's App token (APP_TOKEN), or hands the run to a person.
import { execFileSync } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { changedFiles, prepareBuild, publishBuild, type Built, type Push } from "./build.ts";
import { clients, maintainer, required } from "./env.ts";
import { GitHub } from "./github.ts";

const { positionals, values } = parseArgs({ allowPositionals: true, options: { run: { type: "string" } } });
const step = positionals[0];
const number = Number(values.run);
if (!["prepare", "publish"].includes(step) || !Number.isInteger(number)) {
  console.error("usage: run-build.ts prepare|publish --run <issue number>");
  process.exit(2);
}

const root = resolve(import.meta.dirname, "../../..");
const repo = required("GITHUB_REPOSITORY");
const git = (args: string[], cwd = root) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
const output = (name: string, value: string) => process.env.GITHUB_OUTPUT && appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
const summary = (text: string) => process.env.GITHUB_STEP_SUMMARY && appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
const log = (line: string) => {
  console.log(line);
  summary(`- ${line}`);
};

const record = new GitHub({ token: required("GITHUB_TOKEN"), repo });
const ready = await prepareBuild(record, record, number);
if (!ready.go) {
  log(ready.reason);
  output("go", "false");
  process.exit(0);
}

if (step === "prepare") {
  mkdirSync(join(root, ".factory"), { recursive: true });
  writeFileSync(join(root, ".factory/envelope.json"), `${JSON.stringify(ready.envelope, null, 2)}\n`);
  output("go", "true");
  output("branch", ready.branch);
  log(`run #${number}: building ${ready.branch} from the spec with sha256 ${ready.sha256.slice(0, 12)}`);
  process.exit(0);
}

// publish
const token = required("APP_TOKEN");
const remote = `https://x-access-token:${token}@github.com/${repo}.git`;
const author = ["-c", "user.name=agentic-sdlc factory", "-c", "user.email=factory@users.noreply.github.com"];
// Not through git(): its trim() would eat the leading space of the first line's status.
const changed = changedFiles(execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: root, encoding: "utf8" }));
const blockedFile = join(root, ".factory/blocked.md");
const evidenceDir = join(root, "evidence");
const report = existsSync(join(evidenceDir, "evidence.json")) ? JSON.parse(readFileSync(join(evidenceDir, "evidence.json"), "utf8")) : undefined;
const problems: string[] = report?.problems ?? ["The factory's evidence did not run."];
const built: Built = {
  finished: process.env.AGENT_OUTCOME === "success",
  changed,
  blocked: existsSync(blockedFile) ? readFileSync(blockedFile, "utf8") : undefined,
  evidence: {
    ok: process.env.EVIDENCE_OUTCOME === "success" && problems.length === 0,
    problems,
    markdown: existsSync(join(evidenceDir, "evidence.md")) ? readFileSync(join(evidenceDir, "evidence.md"), "utf8") : "No evidence.",
  },
};

const push: Push = {
  async change(branch, message) {
    git(["checkout", "-B", branch]);
    git(["add", "-A", "--", "apps/hotel"]);
    git([...author, "commit", "-q", "-m", message]);
    git(["push", "-q", remote, `HEAD:refs/heads/${branch}`]);
  },
  // Screenshots live on their own branch, so a PR comment can show them and the change carries none.
  async evidence(folder) {
    const dir = mkdtempSync(join(tmpdir(), "evidence-"));
    const exists = execFileSync("git", ["ls-remote", remote, "refs/heads/evidence"], { encoding: "utf8" }).trim() !== "";
    if (exists) git(["clone", "-q", "--depth", "1", "--branch", "evidence", remote, dir], tmpdir());
    else {
      git(["init", "-q", dir], tmpdir());
      git(["checkout", "-q", "--orphan", "evidence"], dir);
    }
    mkdirSync(join(dir, folder), { recursive: true });
    for (const file of readdirSync(evidenceDir)) cpSync(join(evidenceDir, file), join(dir, folder, file));
    git(["add", "-A"], dir);
    git([...author, "commit", "-q", "-m", `Evidence for ${folder}`], dir);
    git(["push", "-q", remote, "HEAD:refs/heads/evidence"], dir);
  },
};

const { board } = clients();
await publishBuild(
  { record, board, pulls: new GitHub({ token, repo }), push, runUrl: required("RUN_URL"), maintainer: maintainer(), log },
  { run: ready.run, branch: ready.branch, sha256: ready.sha256, built },
);
