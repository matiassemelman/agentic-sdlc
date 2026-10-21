# Current Work Status

**Updated:** 2026-10-21 (evening)

## Active Epic
**EPIC-001:** Factory v0, from a design session to production (reordered 2026-10-20: verification first, people on the loop)
**File:** `docs/epics/epic-001-factory-v0.md`

## Active Stage
**STAGE-001-006 (first slice):** Epics on the board, one drag queues them
**File:** `docs/stages/stage-001-006-epics.md`
**Phase:** Built and merged (PR #35 Seed files epics, PR #36 Board queues the epic); Seed ran live and filed the epic. **The queue has not run live yet.**
**Before:** STAGE-001-004 works live end to end (KAN-3 in production); its code review's fixes (PR #32, 2026-10-21) have not run live either.

## Context
- **STAGE-001-003 done on 2026-10-20.** The board works live: webhook → relay → `Board`, the spec on the card, approval bound to the hash, the queue, wrong drags put back, rejection, failures that say why. Fixed on the way: the webhook's URL, the Ready and Done columns, the listing lag (GitHub and Jira), the SDK's parser, the spec's limits. Details in its stage file.
- **GitHub App `agentic-sdlc-factory` (id 5404226):** `FACTORY_APP_ID` and `FACTORY_APP_PRIVATE_KEY` are in the `factory` environment, and the key is in `~/.config/agentic-sdlc/factory-app.private-key.pem` (mode 600). Installed on the repo with contents, issues and pull requests write (checked with a JWT, `docs/runbook.md`).
- **Design changed: people on the loop** ([ADR 0001](adr/0001-people-on-the-loop.md)). The factory takes a ticket from Ready to a verified PR by itself. A person decides when it escalates on the card and at the merge. Tickets come from a design session (`/grill-with-docs`), STAGE-001-006. Epic and `design.md` rewritten.
- **Board now:** 8 columns (Triage and Acceptance removed on 2026-10-21).
  - **Backlog, set up for the interview demo:** KAN-5 is the epic `compare-rooms`, with KAN-6 (room-order) and KAN-7 (price-per-guest) under it. The demo: Matias drags KAN-6 to Ready and KAN-7 follows. Not run yet.
  - Also in Backlog, from the same Seed run: KAN-8 (guest-filter) and KAN-9 (stay-total). KAN-10, a usd-prices duplicate, was deleted.
  - In Done: KAN-3 (usd-prices, run #19, PR #26 merged; production shows the switch), KAN-4 (guest-filter rehearsal, PR #29 closed unmerged, so `main` has no guest filter), KAN-1 and KAN-2.
- **The build's executor is Sonnet 5.5 at high effort** (`BUILD_MODEL`, `BUILD_EFFORT` in the `factory` environment). Haiku 5.5 was tried on KAN-4: 447 s when it finished, and once it ran out of turns polling a background task. Sonnet on the same ticket: 147 s. Numbers in the stage file.
- **Limits:** 20 runs a day (`MAX_RUNS_PER_DAY`); the Anthropic credit was topped up on 2026-10-21.
- **Relay:** https://agentic-sdlc-factory.vercel.app (Vercel project `agentic-sdlc-factory`). The webhook secret lives only in `~/.config/agentic-sdlc/jira-webhook-secret` (mode 600) and in Vercel.
- **The Factory account's language must stay English.** Jira translates built-in statuses, and the factory finds statuses by name. Column names are not translated.
- **The private terms live in the `PRIVATE_TERMS` repository variable.** The `repo-checks` job reads them; the file never names them.

## Next Action
Lookups (watch a run or a PR, read the board, start a run, retry a build, show a guard red, Jira ids, secrets): `docs/runbook.md`.

1. **Next session: a visual of the whole system, from zero, for Matias to learn and explain it.** Technical and plain, no pitch: every part and where it runs (Jira and its two accounts, the relay, GitHub Actions and the stations, the GitHub App, the `factory` environment, Anthropic, Vercel, the hotel), one run step by step (who triggers whom, where state lives), and how it was built stage by stage, with the decisions and failures that shaped it. Start with a short `/grill-with-docs` on format and depth; build it from the code and the docs, not from memory.
2. **Then rehearse the exact demo once, and record it** (plan B). Neither the queue (PR #36) nor PR #32's fixes have run live. KAN-5/6/7 are kept for the talk: rehearse with other cards (e.g. KAN-8 and KAN-9 under a rehearsal epic), closing their PRs unmerged as with KAN-4. The talk deck made on 2026-10-21 was discarded as too much of a pitch; its facts can be reused.
3. **Seed files shipped tickets again.** It files every prepared ticket with no open card, so a card in Done (shipped) gets a duplicate in Backlog (KAN-10 on 2026-10-21). Before the interview, file only tickets the board has never had, or mark shipped tickets.
4. **PR #37 (Ubicloud runners) is open, not merged.** On 2026-10-21 GitHub's runners and its job notices stalled for about 15 minutes. Ubicloud did not avoid it: its jobs waited 239 and 363 s for a runner (GitHub notified it late) and ran 62 s against GitHub's 29 s. Measure again on a calm day before deciding; the Ubicloud account costs nothing unused.
5. **Retro of 2026-10-21, still to do:** a read-only Jira token for `scripts/board.sh` (Matias creates it; steps in the runbook); the English rule and the agent's writable folders restated in 4 files (`AGENTS.md`, `write-spec`, `implement-ticket`, `verify-hotel`): point the skills at `AGENTS.md` instead, after the demo, since the agents read them mid-run.
6. **Then the epic:** 005 to 013, self-healing first. Code review findings 6, 7 and 9 are in STAGE-001-004's file.
7. **Known gap:** closing a PR wakes no `Board` run; the run ends on the next event.
8. **Deferred:** the factory doctor and the Jira admin token; Haiku again, told to run every command in the foreground.
