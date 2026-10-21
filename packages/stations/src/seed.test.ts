import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { STATUS } from "./board.ts";
import { reconcile } from "./factory.ts";
import { FakeBoard, FakeRecord } from "./fakes.ts";
import { exampleSpec } from "./fixtures.ts";
import { renderSpecComment } from "./render.ts";
import { adoptRun, checkBoard, seedPrepared } from "./seed.ts";
import { listEpics, listTicketIds } from "./tickets.ts";

const root = resolve(import.meta.dirname, "../../..");

describe("seeding the board", () => {
  it("adds each prepared ticket to Backlog once, an epic's tickets under the epic's card and in its order", async () => {
    const board = new FakeBoard();
    // Derived from tickets/, so a design session that adds tickets or epics breaks no test.
    const epics = listEpics(root);
    const inEpics = new Set(epics.flatMap((e) => e.tickets));
    const expected = [
      ...epics.flatMap((e) => [`epic:${e.id}`, ...e.tickets.map((id) => `ticket:${id}`)]),
      ...listTicketIds(root)
        .filter((id) => !inEpics.has(id))
        .map((id) => `ticket:${id}`),
    ];
    expect(await seedPrepared({ root, board, project: "SD" })).toHaveLength(expected.length);
    expect(await seedPrepared({ root, board, project: "SD" })).toEqual([]);

    const cards = [...board.cards.values()];
    expect(cards.map((s) => s.card.labels)).toEqual(expected.map((label) => [label]));
    expect(cards.every((s) => s.card.status === STATUS.backlog)).toBe(true);
    for (const epic of epics) {
      const card = board.keyFor(`epic:${epic.id}`);
      expect(board.cards.get(card)!.epic).toBe(true);
      expect(epic.tickets.map((id) => board.cards.get(board.keyFor(`ticket:${id}`))!.card.parent)).toEqual(epic.tickets.map(() => card));
    }
    expect(cards.filter((s) => !s.epic && !inEpics.has(s.card.labels[0].slice("ticket:".length))).every((s) => s.card.parent === undefined)).toBe(true);
  });

  it("files an epic's missing tickets under a new epic card, and leaves the ones still open where they are", async () => {
    const board = new FakeBoard();
    const open = await board.create({ project: "SD", summary: "Sort the rooms by price", labels: ["ticket:room-order"] });
    const done = await board.create({ project: "SD", summary: "Price per guest for each room", labels: ["ticket:price-per-guest"] });
    board.drag(done, STATUS.done);
    await seedPrepared({ root, board, project: "SD" });
    const filed = [...board.cards.values()].filter((s) => s.card.labels.includes("ticket:price-per-guest") && s.card.key !== done);
    expect(filed.map((s) => s.card.parent)).toEqual(["SD-3"]);
    expect(board.cards.get(open)!.card.parent).toBeUndefined();
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

  it("passes a Task workflow with every status the factory uses", () => {
    const board = new FakeBoard();
    expect(checkBoard([{ type: "Task", subtask: false, statuses: board.statusNames }], "en_US")).toEqual({ ok: true, report: ["The Task workflow has all 8 statuses."] });
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
