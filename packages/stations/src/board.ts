import { MAX_RUNS_PER_DAY } from "./admission.ts";
import type { RunIssue } from "./github.ts";
import type { Card, Move } from "./jira.ts";

/** The board's statuses, one per column. The factory finds them by these names. */
export const STATUS = {
  backlog: "Backlog",
  triage: "Triage",
  ready: "Ready",
  spec: "Spec",
  specReview: "Spec review",
  build: "Build",
  gates: "Gates",
  acceptance: "Acceptance",
  merge: "Merge",
  done: "Done",
} as const;

/** Where a run's card belongs, by the run's station label on GitHub (the factory's record). */
export const STATION_STATUS: Record<string, string> = {
  "station:spec": STATUS.spec,
  "station:spec-approval": STATUS.specReview,
  "station:build": STATUS.build,
  "station:gates": STATUS.gates,
  "station:acceptance": STATUS.acceptance,
  "station:maintainer": STATUS.merge,
};

/** Statuses only a run's card may be in: a card there without a run was dragged in by hand. */
const RUN_ONLY: string[] = [STATUS.spec, STATUS.specReview, STATUS.build, STATUS.gates, STATUS.acceptance, STATUS.merge];

const WAITING_FOR: Record<string, string> = {
  "station:spec": "The factory is writing the spec; the card moves to Spec review by itself.",
  "station:spec-approval": "The spec waits for the product owner: move the card from Spec review to Build to approve it, or to Done to reject it.",
  "station:build": "The factory is building this change; the card moves on by itself.",
  "station:gates": "The gates are checking this change; the card moves on by itself.",
  "station:acceptance": "The change waits for the product owner to accept it.",
  "station:maintainer": "The change waits for the Maintainer to merge it.",
};

/** A card as the factory sees it: its fields and its history of moves. */
export type Observed = Card & { moves: Move[] };

export type Run = RunIssue & { station?: string };

export type Action =
  | { kind: "take"; card: Observed; ticketId: string }
  | { kind: "approve"; run: Run; card: Observed; by: Move }
  | { kind: "reject"; run: Run; card: Observed; by: Move }
  | { kind: "fail"; run: Run; card: Observed | null; reason: string }
  | { kind: "restore"; card: Observed; to: string; reason: string }
  | { kind: "note"; card: Observed; reason: string };

export type BoardState = {
  /** Open run issues that belong to a card. */
  runs: Run[];
  /** Every card in a status other than Backlog or Done, plus the cards of the open runs. */
  cards: Observed[];
  /** The Factory account: moves it made are not decisions. */
  factory: string;
  runsLast24h: number;
  ticketIds: string[];
  /** The card whose change woke the factory up, if any: only it gets a note while it waits. */
  hint?: string;
};

export const stationOf = (labels: string[]) => labels.find((l) => l.startsWith("station:"));
const lastMove = (card: Observed) => card.moves.at(-1);
/** When the card last entered Ready; a card created there counts from its creation. */
const readySince = (card: Observed) => card.moves.filter((m) => m.to === STATUS.ready).at(-1)?.at ?? card.created;

/**
 * What the factory does next, from what the board and GitHub show now. It compares; it never trusts
 * the message that woke it up. So a lost, repeated or forged message changes nothing, and running it
 * again after its actions finds nothing left to do.
 */
export function decide(state: BoardState): Action[] {
  const actions: Action[] = [];
  const byKey = new Map(state.cards.map((c) => [c.key, c]));
  const withRun = new Set(state.runs.map((r) => r.key));

  for (const run of state.runs) {
    const card = run.key ? byKey.get(run.key) ?? null : null;
    // A run still at the spec station when the factory looks was left half done: no other job runs it.
    if (run.station === "station:spec") {
      actions.push({ kind: "fail", run, card, reason: "The spec station stopped before it finished (its job was cancelled or timed out)." });
      continue;
    }
    if (!card || !run.station) continue;
    const expected = STATION_STATUS[run.station];
    if (!expected || card.status === expected) continue;
    const move = lastMove(card);
    const decided = move && move.by !== state.factory && move.to === card.status && move.from === STATUS.specReview;
    if (run.station === "station:spec-approval" && decided && card.status === STATUS.build) {
      actions.push({ kind: "approve", run, card, by: move });
    } else if (run.station === "station:spec-approval" && decided && card.status === STATUS.done) {
      actions.push({ kind: "reject", run, card, by: move });
    } else {
      actions.push({ kind: "restore", card, to: expected, reason: `This card belongs in ${expected}. ${WAITING_FOR[run.station]}` });
    }
  }

  const loose = state.cards.filter((c) => !withRun.has(c.key));
  for (const card of loose.filter((c) => RUN_ONLY.includes(c.status))) {
    actions.push({ kind: "restore", card, to: STATUS.backlog, reason: "No run is working on this card. To start it, move it to Ready; the factory moves it from there." });
  }

  const ready = loose.filter((c) => c.status === STATUS.ready).sort((a, b) => readySince(a).localeCompare(readySince(b)));
  const prepared: { card: Observed; ticketId: string }[] = [];
  for (const card of ready) {
    const ticketId = card.labels.find((l) => l.startsWith("ticket:"))?.slice("ticket:".length);
    if (ticketId && state.ticketIds.includes(ticketId)) prepared.push({ card, ticketId });
    else
      actions.push({
        kind: "restore",
        card,
        to: STATUS.backlog,
        reason: "For now the factory takes only the prepared tickets, the cards labelled ticket:<name>. This card goes back to Backlog.",
      });
  }

  // A run that ends in this pass (rejected or failed) frees the factory for the next pass, not this one.
  const ending = new Set(actions.flatMap((a) => (a.kind === "reject" || a.kind === "fail" ? [a.run.number] : [])));
  const busy = state.runs.find((r) => r.station !== "station:maintainer" && !ending.has(r.number));
  const limited = state.runsLast24h >= MAX_RUNS_PER_DAY;
  const next = prepared[0];
  if (next && !busy && !ending.size && !limited) {
    actions.push({ kind: "take", card: next.card, ticketId: next.ticketId });
  } else if (busy || limited) {
    const waiting = prepared.find((p) => p.card.key === state.hint);
    const reason = busy
      ? `Waiting in Ready: the factory is busy with ${busy.key ?? `run #${busy.number}`}. It takes the card that has waited longest when it is free.`
      : `Waiting in Ready: the factory already ran ${state.runsLast24h} times in the last 24 hours (limit ${MAX_RUNS_PER_DAY}).`;
    if (waiting) actions.push({ kind: "note", card: waiting.card, reason });
  }
  return actions;
}
