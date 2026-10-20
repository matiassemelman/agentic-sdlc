import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { STATUS } from "./board.ts";
import { reconcile, type Factory } from "./factory.ts";
import { FakeBoard, FakeRecord, stamp } from "./fakes.ts";
import { exampleSpec } from "./fixtures.ts";
import { seedPrepared } from "./seed.ts";
import { StationError, type ModelCall } from "./spec-station.ts";

const root = resolve(import.meta.dirname, "../../..");
const tokens = { input: 3000, output: 2000, cacheWrite: 0, cacheRead: 0 };

async function setup(model: ModelCall = async () => ({ output: exampleSpec(), tokens, stopReason: "end_turn" })) {
  const board = new FakeBoard();
  const record = new FakeRecord();
  const calls: string[] = [];
  const call: ModelCall = async (request) => {
    calls.push(request.user);
    return model(request);
  };
  const f: Factory = { root, project: "SD", board, record, call, runUrl: "https://github.com/o/r/actions/runs/1", now: () => new Date(stamp()) };
  const [guestFilter, stayTotal, usdPrices] = await seedPrepared({ root, board, project: "SD" });
  return { f, board, record, calls, guestFilter, stayTotal, usdPrices };
}

describe("the factory on the board", () => {
  it("takes a card moved to Ready and puts its spec in Spec review, on the card and on the run issue", async () => {
    const { f, board, record, guestFilter, calls } = await setup();
    board.drag(guestFilter, STATUS.ready);
    const specs = await reconcile(f, guestFilter);

    expect(board.status(guestFilter)).toBe(STATUS.specReview);
    const [run] = record.issues;
    expect(run.title).toBe(`${guestFilter}: Filter rooms by number of guests`);
    expect(run.labels).toEqual(["run", "ticket:guest-filter", "station:spec-approval"]);
    expect(run.body).toContain("moved to Ready by Guest");
    expect(run.comments[0].body).toContain(`Decide on the board: move ${guestFilter} from Spec review to Build`);
    expect(board.notes(guestFilter).at(-1)).toMatch(/^Spec: Filter rooms by number of guests/);
    expect(board.notes(guestFilter).at(-1)).toMatch(/Spec sha256: [0-9a-f]{64}/);
    expect(specs.map((s) => s.meta.card)).toEqual([guestFilter]);
    // The text comes from tickets/, not from the card.
    expect(calls[0]).toContain("from 1 to 6");
  });

  it("approves the spec when a person moves the card from Spec review to Build", async () => {
    const { f, board, record, guestFilter } = await setup();
    board.drag(guestFilter, STATUS.ready);
    await reconcile(f);
    board.drag(guestFilter, STATUS.build, "po-id", "Ana");
    await reconcile(f, guestFilter);

    const [run] = record.issues;
    expect(run.labels).toContain("station:build");
    expect(run.comments.at(-1)!.body).toMatch(/^Spec approved by Ana on the board/);
    expect(run.comments.at(-1)!.body).toMatch(/<!-- factory:approved sha256=[0-9a-f]{64} by=jira:po-id -->/);
    expect(board.status(guestFilter)).toBe(STATUS.build);
    expect(board.notes(guestFilter).at(-1)).toMatch(/^Spec approved by Ana/);
  });

  it("refuses the approval when the spec on the card was edited", async () => {
    const { f, board, record, guestFilter } = await setup();
    board.drag(guestFilter, STATUS.ready);
    await reconcile(f);
    const shown = board.cards.get(guestFilter)!.comments.at(-1)!;
    Object.assign(shown, { text: shown.text.replace("exactly Bellver and Badia show", "every room shows"), updated: stamp() });
    board.drag(guestFilter, STATUS.build, "po-id", "Ana");
    await reconcile(f);

    expect(record.issues[0].labels).toContain("station:spec-approval");
    expect(board.status(guestFilter)).toBe(STATUS.specReview);
    expect(board.notes(guestFilter).at(-1)).toContain("the spec on the card was edited after the factory posted it");
  });

  it("rejects the spec when a person moves the card to Done, then takes the card waiting in Ready", async () => {
    const { f, board, record, guestFilter, usdPrices } = await setup();
    board.drag(guestFilter, STATUS.ready);
    await reconcile(f);
    board.drag(usdPrices, STATUS.ready);
    await reconcile(f, usdPrices);
    expect(board.notes(usdPrices).at(-1)).toContain(`busy with ${guestFilter}`);
    expect(board.status(usdPrices)).toBe(STATUS.ready);

    board.drag(guestFilter, STATUS.done, "po-id", "Ana");
    await reconcile(f, guestFilter);

    expect(record.issues[0]).toMatchObject({ open: false, closedAs: "not_planned" });
    expect(record.issues[0].labels).toContain("outcome:rejected");
    expect(board.status(usdPrices)).toBe(STATUS.specReview);
    expect(record.issues[1].title).toBe(`${usdPrices}: Prices in euros or US dollars`);
  });

  it("puts back a card a person dragged to a station the factory owns", async () => {
    const { f, board, record, guestFilter, stayTotal } = await setup();
    board.drag(stayTotal, STATUS.gates);
    board.drag(guestFilter, STATUS.ready);
    await reconcile(f);
    board.drag(guestFilter, STATUS.acceptance, "po-id", "Ana");
    await reconcile(f);

    expect(board.status(stayTotal)).toBe(STATUS.backlog);
    expect(board.notes(stayTotal).at(-1)).toContain("No run is working on this card");
    expect(board.status(guestFilter)).toBe(STATUS.specReview);
    expect(board.notes(guestFilter).at(-1)).toMatch(/^Ana moved this card to Acceptance\. This card belongs in Spec review/);
    expect(record.issues[0].labels).toContain("station:spec-approval");
  });

  it("ends the run with a readable reason when the spec station fails", async () => {
    const { f, board, record, guestFilter } = await setup(async () => {
      throw new StationError("The model call was refused: the factory's Anthropic API key is missing or not valid.");
    });
    board.drag(guestFilter, STATUS.ready);
    await reconcile(f);

    expect(record.issues[0]).toMatchObject({ open: false, closedAs: "not_planned" });
    expect(record.issues[0].labels).toContain("outcome:failed");
    expect(record.issues[0].comments.at(-1)!.body).toContain("Anthropic API key");
    expect(board.status(guestFilter)).toBe(STATUS.done);
  });

  it("closes a run that a cancelled job left at the spec station", async () => {
    const { f, board, record, guestFilter } = await setup();
    board.drag(guestFilter, STATUS.spec, "factory-id", "Factory");
    await record.create({ title: `${guestFilter}: Filter rooms by number of guests`, body: "", labels: ["run", "ticket:guest-filter", "station:spec"] });
    await reconcile(f);

    expect(record.issues[0].labels).toContain("outcome:failed");
    expect(board.status(guestFilter)).toBe(STATUS.done);
  });

  it("does nothing new when woken again with no change", async () => {
    const { f, board, record, guestFilter } = await setup();
    board.drag(guestFilter, STATUS.ready);
    await reconcile(f);
    const before = JSON.stringify([...board.cards.values(), record.issues]);
    await reconcile(f);
    await reconcile(f, "SD-99");
    expect(JSON.stringify([...board.cards.values(), record.issues])).toBe(before);
  });
});
