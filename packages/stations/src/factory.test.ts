import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { STATUS } from "./board.ts";
import { reconcile, type Factory } from "./factory.ts";
import { FakeBoard, FakeRecord, stamp } from "./fakes.ts";
import { HttpError } from "./http.ts";
import { exampleSpec, unclearSpec } from "./fixtures.ts";
import { SHOWN_SHA } from "./render.ts";
import { seedPrepared } from "./seed.ts";
import { StationError, type ModelCall } from "./spec-station.ts";

const root = resolve(import.meta.dirname, "../../..");
const tokens = { input: 3000, output: 2000, cacheWrite: 0, cacheRead: 0 };
/** A model whose spec has more assumptions than the limit, so the spec gate sends it to a person in Spec review. */
const unclear: ModelCall = async () => ({ output: unclearSpec(), tokens, stopReason: "end_turn" });

async function setup(model: ModelCall = async () => ({ output: exampleSpec(), tokens, stopReason: "end_turn" })) {
  const board = new FakeBoard();
  const record = new FakeRecord();
  const calls: string[] = [];
  const call: ModelCall = async (request) => {
    calls.push(request.user);
    return model(request);
  };
  const f: Factory = { root, project: "SD", board, record, call, runUrl: "https://github.com/o/r/actions/runs/1", now: () => new Date(stamp()) };
  await seedPrepared({ root, board, project: "SD" });
  const [guestFilter, stayTotal, usdPrices] = ["guest-filter", "stay-total", "usd-prices"].map((id) => board.keyFor(`ticket:${id}`));
  return { f, board, record, calls, guestFilter, stayTotal, usdPrices };
}

describe("the factory on the board", () => {
  it("takes a card moved to Ready, and the spec gate approves a clear spec and moves the card to Build", async () => {
    const { f, board, record, guestFilter, calls } = await setup();
    board.drag(guestFilter, STATUS.ready);
    const specs = await reconcile(f, guestFilter);

    expect(board.status(guestFilter)).toBe(STATUS.build);
    expect(record.dispatched).toEqual([{ workflow: "build.yml", inputs: { run: "10" } }]);
    const [run] = record.issues;
    expect(run.title).toBe(`${guestFilter}: Filter rooms by number of guests`);
    expect(run.labels).toEqual(["run", "ticket:guest-filter", "station:build"]);
    expect(run.body).toContain("moved to Ready by Guest");
    expect(run.comments[0].body).toContain("The spec gate decides next");
    expect(run.comments.at(-1)!.body).toMatch(/^Spec approved by the spec gate, sha256 `[0-9a-f]{12}`\. Next station: build\./);
    expect(run.comments.at(-1)!.body).toMatch(/<!-- factory:approved sha256=[0-9a-f]{64} by=gate:spec -->/);
    const [shown, approved] = board.notes(guestFilter).slice(-2);
    expect(shown).toMatch(/^Spec: Filter rooms by number of guests/);
    expect(shown).toMatch(/Spec sha256: [0-9a-f]{64}/);
    expect(shown).not.toContain("move the card");
    expect(approved).toMatch(/^Spec approved by the spec gate \(sha256 [0-9a-f]{12}\)\. Next station: build\.$/);
    expect(specs.map((s) => s.meta.card)).toEqual([guestFilter]);
    // The text comes from tickets/, not from the card.
    expect(calls[0]).toContain("from 1 to 6");
  });

  it("sends an unclear spec to a person in Spec review, with the reasons on the card and on the run issue", async () => {
    const { f, board, record, guestFilter } = await setup(unclear);
    board.drag(guestFilter, STATUS.ready);
    await reconcile(f, guestFilter);
    expect(record.dispatched).toEqual([]);

    expect(board.status(guestFilter)).toBe(STATUS.specReview);
    const [run] = record.issues;
    expect(run.labels).toEqual(["run", "ticket:guest-filter", "station:spec-approval"]);
    expect(run.comments.at(-1)!.body).toBe(
      `The spec gate needs a person: 9 choices the ticket leaves open (the limit is 8). Move ${guestFilter} to Build to approve the spec as it is, or to Done to reject it.`,
    );
    const [shown, escalated] = board.notes(guestFilter).slice(-2);
    expect(shown).toContain("To approve this spec, move the card to Build. To reject it, move it to Done.");
    expect(escalated).toBe("The spec gate needs a person: 9 choices the ticket leaves open (the limit is 8). Move the card to Build to approve the spec as it is, or to Done to reject it.");
  });

  it("ends the run when the spec has a hard problem", async () => {
    const { f, board, record, guestFilter } = await setup(async () => ({ output: { ...exampleSpec(), files: [".github/workflows/gates.yml"] }, tokens, stopReason: "end_turn" }));
    board.drag(guestFilter, STATUS.ready);
    await reconcile(f);

    expect(record.issues[0]).toMatchObject({ open: false, closedAs: "not_planned" });
    expect(record.issues[0].labels).toContain("outcome:failed");
    expect(record.issues[0].comments.at(-1)!.body).toContain("file .github/workflows/gates.yml is outside apps/hotel/");
    expect(board.status(guestFilter)).toBe(STATUS.done);
  });

  it("approves the spec when a person moves the card from Spec review to Build", async () => {
    const { f, board, record, guestFilter } = await setup(unclear);
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
    expect(record.dispatched).toEqual([{ workflow: "build.yml", inputs: { run: "10" } }]);
  });

  it("refuses the approval when the spec on the card was edited", async () => {
    const { f, board, record, guestFilter } = await setup(unclear);
    board.drag(guestFilter, STATUS.ready);
    await reconcile(f);
    const shown = board.cards.get(guestFilter)!.comments.find((c) => SHOWN_SHA.test(c.text))!;
    Object.assign(shown, { text: shown.text.replace("exactly Bellver and Badia show", "every room shows"), updated: stamp() });
    board.drag(guestFilter, STATUS.build, "po-id", "Ana");
    await reconcile(f);

    expect(record.issues[0].labels).toContain("station:spec-approval");
    expect(board.status(guestFilter)).toBe(STATUS.specReview);
    expect(board.notes(guestFilter).at(-1)).toContain("the spec on the card was edited after the factory posted it");
  });

  it("rejects the spec when a person moves the card to Done, then takes the card waiting in Ready", async () => {
    const { f, board, record, guestFilter, usdPrices } = await setup(unclear);
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

  it("takes the card waiting in Ready after a rejection, though GitHub and Jira still list what it just changed", async () => {
    const { f, board, record, guestFilter, usdPrices } = await setup(unclear);
    board.drag(guestFilter, STATUS.ready);
    await reconcile(f);
    board.drag(usdPrices, STATUS.ready);
    await reconcile(f, usdPrices);
    board.drag(guestFilter, STATUS.done, "po-id", "Ana");
    // Seen live on 2026-10-20: the look right after the rejection still listed the closed run as open.
    record.freezeListing();
    board.freezeSearch();
    await reconcile(f, guestFilter);

    expect(record.issues[0].comments.filter((c) => c.body.startsWith("Spec rejected"))).toHaveLength(1);
    expect(record.issues.map((i) => i.title)).toEqual([`${guestFilter}: Filter rooms by number of guests`, `${usdPrices}: Prices in euros or US dollars`]);
    expect(board.status(usdPrices)).toBe(STATUS.specReview);
    expect(board.notes(usdPrices).filter((n) => n.includes("This card belongs"))).toHaveLength(0);
  });

  it("puts back a card a person dragged to a station the factory owns", async () => {
    const { f, board, record, guestFilter, stayTotal } = await setup(unclear);
    board.drag(stayTotal, STATUS.gates);
    board.drag(guestFilter, STATUS.ready);
    await reconcile(f);
    board.drag(guestFilter, STATUS.gates, "po-id", "Ana");
    await reconcile(f);

    expect(board.status(stayTotal)).toBe(STATUS.backlog);
    expect(board.notes(stayTotal).at(-1)).toContain("No run is working on this card");
    expect(board.status(guestFilter)).toBe(STATUS.specReview);
    expect(board.notes(guestFilter).at(-1)).toMatch(/^Ana moved this card to Gates\. This card belongs in Spec review/);
    expect(record.issues[0].labels).toContain("station:spec-approval");
  });

  it("leaves a card it just took where it is, and waits, when the next look gets GitHub's list from before the run", async () => {
    const { f, board, record, guestFilter, usdPrices } = await setup(unclear);
    record.freezeListing();
    board.drag(guestFilter, STATUS.ready);
    await reconcile(f);
    board.drag(usdPrices, STATUS.ready);
    await reconcile(f, usdPrices);

    expect(board.status(guestFilter)).toBe(STATUS.specReview);
    expect(board.status(usdPrices)).toBe(STATUS.ready);
    expect(board.notes(usdPrices).at(-1)).toContain(`busy with ${guestFilter}`);
    expect(record.issues).toHaveLength(1);
  });

  it("counts an approval once when the next look gets GitHub's list from before it", async () => {
    const { f, board, record, guestFilter } = await setup(unclear);
    board.drag(guestFilter, STATUS.ready);
    await reconcile(f);
    record.freezeListing();
    board.drag(guestFilter, STATUS.build, "po-id", "Ana");
    await reconcile(f, guestFilter);
    await reconcile(f, guestFilter);

    expect(record.issues[0].comments.filter((c) => c.body.startsWith("Spec approved"))).toHaveLength(1);
    expect(board.notes(guestFilter).filter((n) => n.startsWith("Spec approved"))).toHaveLength(1);
    expect(record.issues[0].labels).toContain("station:build");
  });

  it("takes a card moved to Ready that Jira's search does not show yet", async () => {
    const { f, board, guestFilter } = await setup();
    board.freezeSearch();
    board.drag(guestFilter, STATUS.ready);
    await reconcile(f, guestFilter);

    expect(board.status(guestFilter)).toBe(STATUS.build);
  });

  it("puts back a dragged card once, though Jira's search still shows it where the person left it", async () => {
    const { f, board, stayTotal } = await setup();
    board.drag(stayTotal, STATUS.gates);
    board.freezeSearch();
    await reconcile(f, stayTotal);

    expect(board.status(stayTotal)).toBe(STATUS.backlog);
    expect(board.notes(stayTotal).filter((n) => n.includes("No run is working on this card"))).toHaveLength(1);
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

  it("ends the run with what failed when Jira fails after the run was opened", async () => {
    const { f, board, record, guestFilter } = await setup();
    board.link = async () => {
      throw new HttpError("Jira", 503, "linking the run", "");
    };
    board.drag(guestFilter, STATUS.ready);
    await reconcile(f);

    expect(record.issues).toHaveLength(1);
    expect(record.issues[0]).toMatchObject({ open: false, closedAs: "not_planned" });
    expect(record.issues[0].comments.at(-1)!.body).toContain("Jira returned 503 while linking the run");
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

describe("after the build: the gates, the Maintainer, the merge", () => {
  const fast = [
    { name: "Lint, types, unit, build, design", status: "completed", conclusion: "success" },
    { name: "Workflow lint, private terms", status: "completed", conclusion: "success" },
  ];
  const passing = [...fast, { name: "E2E on Preview – hotel-mirador", status: "completed", conclusion: "success" }];

  /** A run the build station published: PR #42 open, the run at the gates, its card in Gates. */
  async function published(checks: { name: string; status: string; conclusion: string | null }[]) {
    const s = await setup();
    s.f.maintainer = "maintainer-id";
    s.board.drag(s.guestFilter, STATUS.ready);
    await reconcile(s.f, s.guestFilter);
    const run = s.record.issues[0];
    await s.record.relabel(run.number, { add: ["station:gates"], remove: ["station:build"] });
    await s.board.move(s.guestFilter, STATUS.gates);
    const pull = { number: 42, url: "https://github.com/o/r/pull/42", state: "open" as const, sha: "abc1234" };
    s.record.pullsByBranch.set(`run/${run.number}-filter-rooms-by-number-of-guests`, pull);
    s.record.checksBySha.set(pull.sha, checks);
    return { ...s, run, pull };
  }

  it("waits for the E2E run on the preview, though the fast gates passed", async () => {
    const { f, board, guestFilter } = await published(fast);
    await reconcile(f);
    expect(board.status(guestFilter)).toBe(STATUS.gates);
  });

  it("still moves the card and assigns the Maintainer when the move failed once", async () => {
    const { f, board, record, run, guestFilter } = await published(passing);
    const move = board.move.bind(board);
    let failedOnce = false;
    board.move = async (key: string, status: string) => {
      if (status === STATUS.merge && !failedOnce) {
        failedOnce = true;
        throw new HttpError("Jira", 503, `moving ${key} to ${status}`, "");
      }
      return move(key, status);
    };
    await expect(reconcile(f)).rejects.toThrow("Jira returned 503");
    await reconcile(f);
    expect(board.status(guestFilter)).toBe(STATUS.merge);
    expect(board.assignee(guestFilter)).toBe("maintainer-id");
    expect(record.get(run.number).comments.filter((c) => c.body.includes("factory:gates-passed"))).toHaveLength(1);
  });

  it("waits while a gate is still running", async () => {
    const { f, board, run, guestFilter } = await published([passing[0], { ...passing[1], status: "in_progress", conclusion: null }, passing[2]]);
    await reconcile(f);
    expect(board.status(guestFilter)).toBe(STATUS.gates);
    expect(run.labels).toContain("station:gates");
  });

  it("moves a PR that passed every gate to the Maintainer, and assigns them the card", async () => {
    const { f, board, record, run, guestFilter } = await published(passing);
    await reconcile(f);
    expect(board.status(guestFilter)).toBe(STATUS.merge);
    expect(record.get(run.number).labels).toContain("station:maintainer");
    expect(board.assignee(guestFilter)).toBe("maintainer-id");
    expect(board.notes(guestFilter).at(-1)).toMatch(/^Every gate passed\. The Maintainer reviews the evidence on PR #42/);
  });

  it("says the gates passed once, though GitHub's list still shows the run at the gates", async () => {
    const { f, board, record, run, guestFilter } = await published(passing);
    record.freezeListing();
    await reconcile(f);
    await reconcile(f);
    expect(board.notes(guestFilter).filter((n) => n.startsWith("Every gate passed"))).toHaveLength(1);
    expect(record.get(run.number).comments.filter((c) => c.body.includes("factory:gates-passed"))).toHaveLength(1);
    expect(board.status(guestFilter)).toBe(STATUS.merge);
  });

  it("escalates once when a gate fails, with the card in Gates and assigned to the Maintainer", async () => {
    const { f, board, record, run, guestFilter } = await published([passing[0], { ...passing[1], conclusion: "failure" }, passing[2]]);
    record.freezeListing();
    await reconcile(f);
    await reconcile(f);
    expect(board.status(guestFilter)).toBe(STATUS.gates);
    expect(record.get(run.number).labels).toContain("escalated");
    expect(board.assignee(guestFilter)).toBe("maintainer-id");
    expect(board.notes(guestFilter).filter((n) => n.startsWith("The gates need a person: Workflow lint, private terms failed on PR #42"))).toHaveLength(1);
  });

  it("closes the run and moves the card to Done when the Maintainer merges, once, and takes the next card", async () => {
    const { f, board, record, run, pull, guestFilter, stayTotal } = await published(passing);
    await reconcile(f);
    board.drag(stayTotal, STATUS.ready);
    record.pullsByBranch.set(`run/${run.number}-filter-rooms-by-number-of-guests`, { ...pull, state: "merged" });
    record.freezeListing();
    await reconcile(f);
    await reconcile(f);
    expect(board.status(guestFilter)).toBe(STATUS.done);
    expect(record.get(run.number)).toMatchObject({ open: false, closedAs: "completed" });
    expect(record.get(run.number).labels).toContain("outcome:merged");
    expect(board.notes(guestFilter).filter((n) => n.includes("was merged"))).toHaveLength(1);
    expect(board.status(stayTotal)).toBe(STATUS.build);
  });

  it("ends the run once when its PR is closed without a merge, though GitHub's list still shows it open", async () => {
    const { f, board, record, run, pull, guestFilter } = await published(passing);
    record.pullsByBranch.set(`run/${run.number}-filter-rooms-by-number-of-guests`, { ...pull, state: "closed" });
    record.freezeListing();
    await reconcile(f);
    await reconcile(f);
    expect(record.get(run.number).comments.filter((c) => c.body.startsWith("The run stops here"))).toHaveLength(1);
    expect(board.notes(guestFilter).filter((n) => n.startsWith(`Run #${run.number} stopped`))).toHaveLength(1);
    expect(record.get(run.number).labels).toContain("outcome:failed");
    expect(board.status(guestFilter)).toBe(STATUS.done);
    expect(board.notes(guestFilter).at(-1)).toContain("PR #42 was closed without a merge.");
  });

  it("keeps the run going when the card cannot be assigned: a notice never stops the factory", async () => {
    const { f, board, record, guestFilter } = await setup(unclear);
    f.maintainer = "nobody";
    board.assign = async () => {
      throw new HttpError("Jira", 400, "assigning the card", "user cannot be assigned");
    };
    board.drag(guestFilter, STATUS.ready);
    await reconcile(f, guestFilter);
    expect(board.status(guestFilter)).toBe(STATUS.specReview);
    expect(record.issues[0].labels).toContain("station:spec-approval");
    expect(record.issues[0].open).toBe(true);
  });

  it("assigns the Maintainer a spec the spec gate sends to a person", async () => {
    const { f, board, guestFilter } = await setup(unclear);
    f.maintainer = "maintainer-id";
    board.drag(guestFilter, STATUS.ready);
    await reconcile(f, guestFilter);
    expect(board.status(guestFilter)).toBe(STATUS.specReview);
    expect(board.assignee(guestFilter)).toBe("maintainer-id");
  });
});
