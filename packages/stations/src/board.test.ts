import { describe, expect, it } from "vitest";
import { MAX_RUNS_PER_DAY } from "./admission.ts";
import { decide, STATUS, type BoardState, type Observed, type Run } from "./board.ts";

const card = (key: string, status: string, moves: Observed["moves"] = [], labels = ["ticket:guest-filter"]): Observed => ({
  key,
  summary: key,
  status,
  labels,
  created: "2026-10-20T10:00:00.000Z",
  moves,
});
const move = (at: string, from: string, to: string, by = "guest-id") => ({ at: `2026-10-20T${at}:00.000Z`, by, byName: by, from, to });
const run = (key: string, station: string, number = 10): Run => ({
  number,
  title: `${key}: x`,
  key,
  labels: ["run", station],
  station,
  open: true,
  createdAt: "2026-10-20T10:00:00.000Z",
  url: "",
});
const state = (partial: Partial<BoardState>): BoardState => ({
  runs: [],
  cards: [],
  factory: "factory-id",
  runsLast24h: 0,
  ticketIds: ["guest-filter", "stay-total", "usd-prices"],
  ...partial,
});

describe("decide", () => {
  it("queues an epic's cards in Backlog behind the one a person moved to Ready, in the epic's order", () => {
    const dragged = { ...card("SD-2", STATUS.ready, [move("11:00", STATUS.backlog, STATUS.ready, "po-id")]), parent: "SD-1" };
    const later = { ...card("SD-4", STATUS.backlog), parent: "SD-1" };
    const next = { ...card("SD-3", STATUS.backlog), parent: "SD-1" };
    const elsewhere = { ...card("SD-6", STATUS.backlog), parent: "SD-5" };
    const actions = decide(state({ cards: [dragged], children: [dragged, later, next, elsewhere] }));
    expect(actions.filter((a) => a.kind === "queue").map((a) => [a.card.key, a.kind === "queue" && a.behind.key])).toEqual([
      ["SD-3", "SD-2"],
      ["SD-4", "SD-2"],
    ]);
  });

  it("takes the card that has waited longest in Ready", () => {
    const later = card("SD-1", STATUS.ready, [move("11:30", STATUS.backlog, STATUS.ready)]);
    const earlier = card("SD-2", STATUS.ready, [move("11:00", STATUS.backlog, STATUS.ready)]);
    expect(decide(state({ cards: [later, earlier] }))).toEqual([{ kind: "take", card: earlier, ticketId: "guest-filter" }]);
  });

  it("sends a card that is not a prepared ticket back to Backlog", () => {
    const written = card("SD-1", STATUS.ready, [move("11:00", STATUS.backlog, STATUS.ready)], []);
    expect(decide(state({ cards: [written] }))).toEqual([expect.objectContaining({ kind: "restore", to: STATUS.backlog })]);
  });

  it("keeps cards waiting at the daily limit, and tells only the card that woke it", () => {
    const one = card("SD-1", STATUS.ready);
    const two = card("SD-2", STATUS.ready);
    const actions = decide(state({ cards: [one, two], runsLast24h: MAX_RUNS_PER_DAY, hint: "SD-2" }));
    expect(actions).toEqual([{ kind: "note", card: two, reason: expect.stringContaining("limit") }]);
  });

  it("does not count the factory's own moves as decisions", () => {
    const moved = card("SD-1", STATUS.build, [move("11:00", STATUS.specReview, STATUS.build, "factory-id")]);
    expect(decide(state({ runs: [run("SD-1", "station:spec-approval")], cards: [moved] }))).toEqual([
      expect.objectContaining({ kind: "restore", to: STATUS.specReview }),
    ]);
  });

  it("approves only a move out of Spec review", () => {
    const skipped = card("SD-1", STATUS.build, [move("11:00", STATUS.ready, STATUS.build)]);
    expect(decide(state({ runs: [run("SD-1", "station:spec-approval")], cards: [skipped] }))[0].kind).toBe("restore");
    const approved = card("SD-1", STATUS.build, [move("11:00", STATUS.specReview, STATUS.build)]);
    expect(decide(state({ runs: [run("SD-1", "station:spec-approval")], cards: [approved] }))[0].kind).toBe("approve");
  });

  it("waits for a rejected run to close before taking the next card", () => {
    const rejected = card("SD-1", STATUS.done, [move("11:00", STATUS.specReview, STATUS.done)]);
    const waiting = card("SD-2", STATUS.ready);
    const actions = decide(state({ runs: [run("SD-1", "station:spec-approval")], cards: [rejected, waiting], hint: "SD-2" }));
    expect(actions.map((a) => a.kind)).toEqual(["reject"]);
  });

  it("finds nothing to do when every card is where its run says", () => {
    const inReview = card("SD-1", STATUS.specReview, [move("11:00", STATUS.spec, STATUS.specReview, "factory-id")]);
    expect(decide(state({ runs: [run("SD-1", "station:spec-approval")], cards: [inReview, card("SD-2", "In Progress", [], [])] }))).toEqual([]);
  });
});
