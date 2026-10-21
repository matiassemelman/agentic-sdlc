# STAGE-001-006 (first slice): Epics on the board, one drag queues them

The rest of STAGE-001-006 (a design session that writes its own tickets) stays in the epic. This slice takes an epic of prepared tickets onto the board, and lets one drag start all of it.

## Decisions (Matias, 2026-10-21, in a design session)
- **D1. One drag queues the epic.** When a person moves one card of an epic to Ready, the factory moves the epic's other cards still in Backlog to Ready behind it, in the epic's order. From there the queue works as before: one run at a time, the next starts by itself after a merge, an escalated run holds the queue, a failed or rejected run lets the next one start.
  - Why not the chain alternative, in which the factory takes the next card from Backlog after each merge: the cards it will build would wait in Backlog, which means "not decided". Ready shows what is committed, and a person can take one card back out of it.
  - Why not cards filed straight into Ready: the product owner's drag is the decision to start.
  - The question it answers: with 15 tickets, nobody drags 15 cards.
- **D2. The epic is a Jira epic**: its cards are its children (`parent`). In the repository, `tickets/epics/<id>.md` lists the epic's tickets in the order they are built. Seed files the epic first, then its tickets in that order, so their keys keep it.
- **D3. Each ticket of an epic stands alone.** It can reach production without the others, so a failed card never blocks the next one.
- **D4. Seed as it is.** It files every prepared ticket with no open card, so it files usd-prices, guest-filter and stay-total again. Matias deletes the usd-prices duplicate; guest-filter stays in Backlog for the live run.
- **The mini test's epic:** `compare-rooms`, with `room-order` (sort by price) and then `price-per-guest`.

## Scope
1. **Seed files epics** (PR 1). The live Seed run checks the main risk: whether the space takes an epic, and `parent` on a new card.
2. **Board queues the epic** (PR 2). The reading after the queue's moves must be tested against a lagging search.

## Progress
- [x] PR 1: `tickets/epics/`, `parseEpic` and `checkEpics` (a ticket in one epic only, each with its file), `Jira.create` with `epic` and `parent`, Seed files epics first. Each new guard was shown red.
- [ ] Live Seed run: the epic and its two cards in Backlog, the cards under the epic.
- [ ] PR 2: Board queues the epic.
- [ ] Mini test: Matias drags `room-order` to Ready; both tickets reach production.
