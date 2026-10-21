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
- [x] Live Seed run (2026-10-21, run 39618409902): KAN-5 the epic, KAN-6 and KAN-7 under it, Jira took the epic and `parent` at once. It also filed KAN-8, KAN-9 and KAN-10 (a usd-prices duplicate, deleted): Seed files again a ticket whose card is in Done.
- [x] PR 2: Board queues the epic. `decide` reads the history, not the event: any card of an epic a person moved to Ready queues the epic's cards that are in Backlog and have not moved since that drag, in key order. A pass that fails halfway is finished by the next one; a card a person takes back out stays out. Each epic card is read again on its own after the search names it (standard 1). Five guards, each shown red: only moves before the drag, only from Backlog, only a person's drag, key order, the fresh read. "Only from Backlog" and the fresh read stayed green at first; they needed a test with a lagging search, in which a card a person had already moved to Ready was queued again.
- [ ] The drag, live. KAN-5/6/7 are kept for the interview demo, so the queue needs a rehearsal with other cards first (CURRENT.md).
