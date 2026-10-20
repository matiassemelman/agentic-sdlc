import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { STATUS } from "./board.ts";
import { reconcile } from "./factory.ts";
import { FakeBoard, FakeRecord } from "./fakes.ts";
import { exampleSpec } from "./fixtures.ts";
import { renderSpecComment } from "./render.ts";
import { adoptRun, checkBoard, seedPrepared } from "./seed.ts";

const root = resolve(import.meta.dirname, "../../..");

describe("seeding the board", () => {
  it("adds each prepared ticket to Backlog once", async () => {
    const board = new FakeBoard();
    expect(await seedPrepared({ root, board, project: "SD" })).toHaveLength(3);
    expect(await seedPrepared({ root, board, project: "SD" })).toEqual([]);
    expect([...board.cards.values()].map((s) => [s.card.summary, s.card.status, s.card.labels])).toEqual([
      ["Filter rooms by number of guests", STATUS.backlog, ["ticket:guest-filter"]],
      ["Total price of a stay, with the tourist tax", STATUS.backlog, ["ticket:stay-total"]],
      ["Prices in euros or US dollars", STATUS.backlog, ["ticket:usd-prices"]],
    ]);
  });

  it("gives a run from before the board its card, and the board can then approve it", async () => {
    const board = new FakeBoard();
    const record = new FakeRecord();
    const run = await record.create({ title: "Filter rooms by number of guests", body: "", labels: ["run", "ticket:guest-filter", "station:spec-approval"] });
    const envelope = { version: 1 as const, spec: exampleSpec(), meta: { issue: run.number, ticket: "guest-filter", model: "claude-opus-5-5", tokens: { input: 1, output: 1, cacheWrite: 0, cacheRead: 0 }, costUsd: 0.07, seconds: 24 } };
    await record.comment(run.number, renderSpecComment(envelope));

    const key = await adoptRun({ root, board, record, project: "SD", number: run.number });
    expect(board.status(key)).toBe(STATUS.specReview);
    expect(record.get(run.number).title).toBe(`${key}: Filter rooms by number of guests`);

    board.drag(key, STATUS.build, "po-id", "Matias");
    const f = { root, project: "SD", board, record, call: async () => ({ output: null, tokens: envelope.meta.tokens, stopReason: null }), runUrl: "https://x" };
    await reconcile(f, key);
    expect(record.get(run.number).labels).toContain("station:build");
  });

  it("passes a Task workflow with all ten statuses", () => {
    const board = new FakeBoard();
    expect(checkBoard([{ type: "Task", subtask: false, statuses: board.statusNames }], "en_US")).toEqual({ ok: true, report: ["The Task workflow has all ten statuses."] });
  });

  it("says when the account's language is why statuses are missing", () => {
    // What the board returned on 2026-10-20 to a factory account set to Spanish.
    const seen = ["Acceptance", "Triage", "Build", "Merge", "Finalizada", "Listo", "Spec review", "Gates", "Backlog", "Spec"];
    const check = checkBoard([{ type: "Task", subtask: false, statuses: seen }], "es_ES");
    expect(check.ok).toBe(false);
    expect(check.report[0]).toContain("reads Jira in es_ES");
    expect(check.report[1]).toContain("lacks these statuses: Ready, Done");
  });

  it("checks the Task workflow, not statuses another work type uses", () => {
    const board = new FakeBoard();
    const check = checkBoard([
      { type: "Epic", subtask: false, statuses: board.statusNames },
      { type: "Task", subtask: false, statuses: board.statusNames.filter((s) => s !== "Ready") },
    ]);
    expect(check).toEqual({ ok: false, report: [expect.stringContaining("lacks these statuses: Ready")] });
  });
});
