import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { STATUS } from "./board.ts";
import { branchFor, changedFiles, judgeBuild, prepareBuild, publishBuild, type Built } from "./build.ts";
import { reconcile } from "./factory.ts";
import { FakeBoard, FakeRecord, stamp } from "./fakes.ts";
import { exampleSpec, unclearSpec } from "./fixtures.ts";
import { seedPrepared } from "./seed.ts";
import type { Spec } from "./spec.ts";

const root = resolve(import.meta.dirname, "../../..");
const tokens = { input: 3000, output: 2000, cacheWrite: 0, cacheRead: 0 };
const green: Built["evidence"] = { ok: true, problems: [], markdown: "| Criterion | … |" };

/** A run the factory took and its spec gate approved (or, with an unclear spec, sent to a person). */
async function approvedRun(spec: Spec = exampleSpec()) {
  const board = new FakeBoard();
  const record = new FakeRecord();
  const [card] = await seedPrepared({ root, board, project: "SD" });
  board.drag(card, STATUS.ready);
  const call = async () => ({ output: spec, tokens, stopReason: "end_turn" });
  await reconcile({ root, project: "SD", board, record, call, runUrl: "https://github.com/o/r/actions/runs/1", now: () => new Date(stamp()) }, card);
  const opened: { title: string; branch: string; body: string; draft: boolean }[] = [];
  const pulls = {
    existing: [] as { number: number; url: string }[],
    async pulls() {
      return this.existing;
    },
    async openPull(pr: { title: string; branch: string; body: string; draft: boolean }) {
      opened.push(pr);
      return { number: 42, url: "https://github.com/o/r/pull/42" };
    },
  };
  const pushed: string[] = [];
  const push = {
    async change(branch: string) {
      pushed.push(`change ${branch}`);
    },
    async evidence(folder: string) {
      pushed.push(`evidence ${folder}`);
    },
  };
  const d = { record, board, pulls, push, runUrl: "https://github.com/o/r/actions/runs/2" };
  return { board, record, card, run: record.issues[0], pulls, opened, pushed, d };
}

describe("the build station", () => {
  it("names the branch after the run and its ticket", () => {
    expect(branchFor({ number: 16, title: "KAN-2: Total price of a stay, with the tourist tax" })).toBe("run/16-total-price-of-a-stay-with-the-tourist");
    expect(branchFor({ number: 3, title: "KAN-9: Show the extraordinarily-long-word-here then a b" })).toBe("run/3-show-the-extraordinarily-long-word-here");
  });

  it("builds a run whose spec was approved for its hash, once", async () => {
    const { record, run, pulls } = await approvedRun();
    const ready = await prepareBuild(record, pulls, run.number);
    expect(ready).toMatchObject({ go: true, branch: `run/${run.number}-filter-rooms-by-number-of-guests` });
    expect(ready.go && ready.envelope.spec.title).toBe("Filter rooms by number of guests");

    pulls.existing = [{ number: 42, url: "https://github.com/o/r/pull/42" }];
    expect(await prepareBuild(record, pulls, run.number)).toEqual({ go: false, reason: `#${run.number} already has PR #42.` });
  });

  it("does not build a spec that waits for a person, nor a run that waits for one", async () => {
    const waiting = await approvedRun(unclearSpec());
    expect(await prepareBuild(waiting.record, waiting.pulls, waiting.run.number)).toMatchObject({ go: false, reason: expect.stringContaining("not at the build station") });

    const { record, run, pulls } = await approvedRun();
    await record.relabel(run.number, { add: ["escalated"] });
    expect(await prepareBuild(record, pulls, run.number)).toMatchObject({ go: false, reason: expect.stringContaining("waits for a person") });
  });

  it("publishes only a change inside the hotel, as a draft when the evidence is not green", () => {
    const hotel = ["apps/hotel/lib/stay.ts", "apps/hotel/lib/stay.test.ts"];
    expect(judgeBuild({ finished: true, changed: hotel, evidence: green })).toEqual({ publish: true, draft: false });
    expect(judgeBuild({ finished: true, changed: hotel, evidence: { ok: false, problems: ["AC-2 fails with the change."], markdown: "" } })).toMatchObject({ publish: true, draft: true });
    expect(judgeBuild({ finished: true, changed: [...hotel, ".github/workflows/gates.yml"], evidence: green })).toMatchObject({ publish: false, reason: expect.stringContaining(".github/workflows/gates.yml") });
    expect(judgeBuild({ finished: true, changed: [], evidence: green })).toMatchObject({ publish: false });
    expect(judgeBuild({ finished: false, changed: hotel, evidence: green })).toMatchObject({ publish: false, reason: expect.stringContaining("did not finish") });
    expect(judgeBuild({ finished: true, changed: hotel, blocked: "The spec asks for a price the data does not have.", evidence: green })).toMatchObject({
      publish: false,
      reason: expect.stringContaining("The spec asks for a price"),
    });
  });

  it("pushes the change and its evidence, opens the PR with the evidence, and moves the card to Gates", async () => {
    const { board, record, card, run, opened, pushed, d } = await approvedRun();
    const ready = await prepareBuild(record, d.pulls, run.number);
    if (!ready.go) throw new Error(ready.reason);
    await publishBuild(d, { run: ready.run, branch: ready.branch, sha256: ready.sha256, built: { finished: true, changed: ["apps/hotel/lib/rooms.ts"], evidence: green } });

    expect(pushed).toEqual([`change ${ready.branch}`, `evidence run-${run.number}`]);
    expect(opened).toHaveLength(1);
    expect(opened[0]).toMatchObject({ title: run.title, branch: ready.branch, draft: false });
    expect(opened[0].body).toContain("| Criterion | … |");
    expect(record.issues[0].labels).toContain("station:gates");
    expect(record.issues[0].labels).not.toContain("station:build");
    expect(board.status(card)).toBe(STATUS.gates);
    expect(board.notes(card).at(-1)).toMatch(/^Built: PR #42, with each criterion's evidence/);
  });

  it("hands the run to a person, and publishes nothing, when the build touched files outside the hotel", async () => {
    const { board, record, card, run, opened, pushed, d } = await approvedRun();
    const ready = await prepareBuild(record, d.pulls, run.number);
    if (!ready.go) throw new Error(ready.reason);
    await publishBuild(d, { run: ready.run, branch: ready.branch, sha256: ready.sha256, built: { finished: true, changed: ["apps/hotel/lib/rooms.ts", "package.json"], evidence: green } });

    expect(pushed).toEqual([]);
    expect(opened).toEqual([]);
    expect(record.issues[0].labels).toEqual(expect.arrayContaining(["station:build", "escalated"]));
    expect(board.status(card)).toBe(STATUS.build);
    expect(board.notes(card).at(-1)).toContain("The build needs a person: the build changed files outside apps/hotel/");
  });
});

describe("the files a build changed", () => {
  it("reads git's own status output, whose first line can start with a space", () => {
    // Run #19 (2026-10-20): the output was trimmed, " M apps/hotel/…" lost its space, and the path lost its "a".
    const repo = mkdtempSync(join(tmpdir(), "changed-"));
    const git = (...args: string[]) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: repo, encoding: "utf8" });
    mkdirSync(join(repo, "apps/hotel/app"), { recursive: true });
    writeFileSync(join(repo, "apps/hotel/app/globals.css"), "a {}\n");
    writeFileSync(join(repo, "apps/hotel/old.ts"), "export {};\n");
    git("init", "-q");
    git("add", "-A");
    git("commit", "-q", "-m", "base");
    writeFileSync(join(repo, "apps/hotel/app/globals.css"), "b {}\n");
    writeFileSync(join(repo, "apps/hotel/new.ts"), "export {};\n");
    git("mv", "apps/hotel/old.ts", "apps/hotel/renamed.ts");
    expect(changedFiles(git("status", "--porcelain", "--untracked-files=all")).sort()).toEqual([
      "apps/hotel/app/globals.css",
      "apps/hotel/new.ts",
      "apps/hotel/renamed.ts",
    ]);
  });
});
