import { MAX_RUNS_PER_DAY } from "./admission.ts";
import type { Check, Pull, RunIssue } from "./github.ts";
import type { Card, Move } from "./jira.ts";

/** The board's statuses, one per column. The factory finds them by these names. */
export const STATUS = {
  backlog: "Backlog",
  ready: "Ready",
  spec: "Spec",
  specReview: "Spec review",
  build: "Build",
  gates: "Gates",
  merge: "Merge",
  done: "Done",
} as const;

/** Where a run's card belongs, by the run's station label on GitHub (the factory's record). */
export const STATION_STATUS: Record<string, string> = {
  "station:spec": STATUS.spec,
  "station:spec-approval": STATUS.specReview,
  "station:build": STATUS.build,
  "station:gates": STATUS.gates,
  "station:maintainer": STATUS.merge,
};

/** Statuses only a run's card may be in: a card there without a run was dragged in by hand. */
const RUN_ONLY: string[] = [STATUS.spec, STATUS.specReview, STATUS.build, STATUS.gates, STATUS.merge];

const WAITING_FOR: Record<string, string> = {
  "station:spec": "The factory is writing the spec; the card moves to Spec review by itself.",
  "station:spec-approval": "The spec waits for the product owner: move the card from Spec review to Build to approve it, or to Done to reject it.",
  "station:build": "The factory is building this change; the card moves on by itself.",
  "station:gates": "The gates are checking this change; the card moves on by itself.",
  "station:maintainer": "The change waits for the Maintainer to review and merge its PR; the card moves to Done by itself.",
};

/**
 * The checks a factory PR must pass before it waits for the Maintainer, by their names on GitHub: the fast gates,
 * and the E2E run on the PR's Vercel preview (its name goes on with the environment, "E2E on Preview – hotel-mirador").
 */
export const GATES = ["Lint, types, unit, build, design", "Workflow lint, private terms", "E2E on Preview"];
const isGate = (gate: string, check: Check) => check.name === gate || check.name.startsWith(`${gate} `);

export type Gates = { state: "pending" | "passed" | "failed"; failed: string[] };

/** Whether a commit passed the gates: each one finished with success. A missing or running gate is pending. */
export function gatesOf(checks: Check[]): Gates {
  const failed = GATES.filter((gate) => checks.some((c) => isGate(gate, c) && c.status === "completed" && c.conclusion !== "success"));
  if (failed.length) return { state: "failed", failed };
  const passed = GATES.every((gate) => checks.some((c) => isGate(gate, c) && c.status === "completed" && c.conclusion === "success"));
  return { state: passed ? "passed" : "pending", failed: [] };
}

/** A card as the factory sees it: its fields and its history of moves. */
export type Observed = Card & { moves: Move[] };

export type Run = RunIssue & { station?: string };
/** A run's PR as GitHub shows it now, with its gates (pending unless the PR is open). */
export type RunPull = Pull & { gates: Gates };

export type Action =
  | { kind: "take"; card: Observed; ticketId: string }
  | { kind: "approve"; run: Run; card: Observed; by: Move }
  | { kind: "reject"; run: Run; card: Observed; by: Move }
  | { kind: "fail"; run: Run; card: Observed | null; reason: string }
  | { kind: "gatesPassed"; run: Run; card: Observed; pull: RunPull }
  | { kind: "gatesFailed"; run: Run; card: Observed; pull: RunPull }
  | { kind: "merged"; run: Run; card: Observed; pull: RunPull }
  | { kind: "restore"; card: Observed; to: string; reason: string }
  | { kind: "queue"; card: Observed; behind: Observed }
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
  /** The PRs of the runs at the gates or waiting for the Maintainer, by run number. */
  pulls?: Record<number, RunPull>;
  /** Every card of each epic a person started by moving one of its cards to Ready, wherever each card is now. */
  children?: Observed[];
};

export const stationOf = (labels: string[]) => labels.find((l) => l.startsWith("station:"));
const lastMove = (card: Observed) => card.moves.at(-1);
/** When the card last entered Ready; a card created there counts from its creation. */
const readySince = (card: Observed) => card.moves.filter((m) => m.to === STATUS.ready).at(-1)?.at ?? card.created;
const ticketOf = (card: Card) => card.labels.find((l) => l.startsWith("ticket:"))?.slice("ticket:".length);
/** A person's last move of the card to Ready: for a card of an epic, the drag that started the epic. */
export const startedBy = (card: Observed, factory: string) => card.moves.filter((m) => m.to === STATUS.ready && m.by !== factory).at(-1);
const keyNumber = (key: string) => Number(key.slice(key.lastIndexOf("-") + 1));

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
    const pull = state.pulls?.[run.number];
    if (pull && (run.station === "station:gates" || run.station === "station:maintainer")) {
      if (pull.state === "merged") {
        actions.push({ kind: "merged", run, card, pull });
        continue;
      }
      if (pull.state === "closed") {
        actions.push({ kind: "fail", run, card, reason: `PR #${pull.number} was closed without a merge.` });
        continue;
      }
      // An escalated run waits for a person; its gates are not looked at again.
      if (run.station === "station:gates" && !run.labels.includes("escalated") && pull.gates.state !== "pending") {
        actions.push({ kind: pull.gates.state === "passed" ? "gatesPassed" : "gatesFailed", run, card, pull });
        continue;
      }
    }
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

  // One drag queues the epic: the epic's cards still in Backlog follow the card a person moved to Ready, in the
  // epic's order (their keys). It reads the history, not the event, so a pass that failed halfway is finished by the
  // next one. A card moved since that drag, such as one a person took back out of Ready, stays where it is.
  const queued = new Set<string>();
  for (const card of state.cards) {
    const ticketId = ticketOf(card);
    const drag = startedBy(card, state.factory);
    if (!card.parent || !drag || !ticketId || !state.ticketIds.includes(ticketId)) continue;
    const rest = (state.children ?? [])
      .filter((c) => c.parent === card.parent && c.key !== card.key && !queued.has(c.key) && c.status === STATUS.backlog)
      .filter((c) => c.moves.every((m) => m.at < drag.at) && state.ticketIds.includes(ticketOf(c) ?? ""))
      .sort((a, b) => keyNumber(a.key) - keyNumber(b.key));
    for (const sibling of rest) {
      queued.add(sibling.key);
      actions.push({ kind: "queue", card: sibling, behind: card });
    }
  }

  const loose = state.cards.filter((c) => !withRun.has(c.key));
  // A card the factory itself put at a station has a run, even when GitHub's list (which lags behind
  // writes) does not show it yet: it stays where it is and keeps the factory busy.
  const unlisted = loose.filter((c) => RUN_ONLY.includes(c.status) && lastMove(c)?.by === state.factory);
  for (const card of loose.filter((c) => RUN_ONLY.includes(c.status) && !unlisted.includes(c))) {
    actions.push({ kind: "restore", card, to: STATUS.backlog, reason: "No run is working on this card. To start it, move it to Ready; the factory moves it from there." });
  }

  const ready = loose.filter((c) => c.status === STATUS.ready).sort((a, b) => readySince(a).localeCompare(readySince(b)));
  const prepared: { card: Observed; ticketId: string }[] = [];
  for (const card of ready) {
    const ticketId = ticketOf(card);
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
  const ending = new Set(actions.flatMap((a) => (a.kind === "reject" || a.kind === "fail" || a.kind === "merged" ? [a.run.number] : [])));
  const run = state.runs.find((r) => r.station !== "station:maintainer" && !ending.has(r.number));
  const busy = run ? (run.key ?? `run #${run.number}`) : unlisted[0]?.key;
  const limited = state.runsLast24h >= MAX_RUNS_PER_DAY;
  const next = prepared[0];
  if (next && !busy && !ending.size && !limited) {
    actions.push({ kind: "take", card: next.card, ticketId: next.ticketId });
  } else if (busy || limited) {
    const waiting = prepared.find((p) => p.card.key === state.hint);
    const reason = busy
      ? `Waiting in Ready: the factory is busy with ${busy}. It takes the card that has waited longest when it is free.`
      : `Waiting in Ready: the factory already ran ${state.runsLast24h} times in the last 24 hours (limit ${MAX_RUNS_PER_DAY}).`;
    if (waiting) actions.push({ kind: "note", card: waiting.card, reason });
  }
  return actions;
}
