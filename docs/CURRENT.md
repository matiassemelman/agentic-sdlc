# Current Work Status

**Updated:** 2026-10-21

## Active Epic
**EPIC-001:** Factory v0, from a design session to production (reordered 2026-10-20: verification first, people on the loop)
**File:** `docs/epics/epic-001-factory-v0.md`

## Active Stage
**STAGE-001-006 (first slice):** Epics on the board, one drag queues them
**File:** `docs/stages/stage-001-006-epics.md`
**Phase:** PR 1 (Seed files epics) open; then the live Seed run, PR 2 (Board queues the epic), the mini test
**Before:** STAGE-001-004 works live end to end (KAN-3 in production); its code review's fixes merged in PR #32 on 2026-10-21, not yet run live.

## Context
- **STAGE-001-003 done on 2026-10-20.** The board works live: webhook → relay → `Board`, the spec on the card, approval bound to the hash, the queue, wrong drags put back, rejection, failures that say why. Fixed on the way: the webhook's URL, the Ready and Done columns, the listing lag (GitHub and Jira), the SDK's parser, the spec's limits. Details in its stage file.
- **GitHub App `agentic-sdlc-factory` (id 5404226):** `FACTORY_APP_ID` and `FACTORY_APP_PRIVATE_KEY` are in the `factory` environment, and the key is in `~/.config/agentic-sdlc/factory-app.private-key.pem` (mode 600). Installed on the repo with contents, issues and pull requests write (checked with a JWT, `docs/runbook.md`).
- **Design changed: people on the loop** ([ADR 0001](adr/0001-people-on-the-loop.md)). The factory takes a ticket from Ready to a verified PR by itself. A person decides when it escalates on the card and at the merge. Tickets come from a design session (`/grill-with-docs`), STAGE-001-006. Epic and `design.md` rewritten.
- **Board now:** 8 columns (Triage and Acceptance removed on 2026-10-21). All four cards in Done:
  - KAN-3 (usd-prices): run #19, PR #26 merged by the Maintainer; production shows the switch.
  - KAN-4 (guest-filter): run #27, the rehearsal of the live run. PR #29 reached Merge and was closed unmerged on purpose, so `main` has no guest filter.
  - KAN-1 (guest-filter) is kept for the live run; KAN-2 (stay-total) is spare.
- **The build's executor is Sonnet 5.5 at high effort** (`BUILD_MODEL`, `BUILD_EFFORT` in the `factory` environment). Haiku 5.5 was tried on KAN-4: 447 s when it finished, and once it ran out of turns polling a background task. Sonnet on the same ticket: 147 s. Numbers in the stage file.
- **Limits:** 20 runs a day (`MAX_RUNS_PER_DAY`); the Anthropic credit was topped up on 2026-10-21.
- **Relay:** https://agentic-sdlc-factory.vercel.app (Vercel project `agentic-sdlc-factory`). The webhook secret lives only in `~/.config/agentic-sdlc/jira-webhook-secret` (mode 600) and in Vercel.
- **The Factory account's language must stay English.** Jira translates built-in statuses, and the factory finds statuses by name. Column names are not translated.
- **The private terms live in the `PRIVATE_TERMS` repository variable.** The `repo-checks` job reads them; the file never names them.

## Next Action
Lookups (watch a run, start one, retry a build, Jira ids, the App check, secrets): `docs/runbook.md`.

1. **The mini test, decided in a design session on 2026-10-21** (`docs/stages/stage-001-006-epics.md`): the epic `compare-rooms` (`room-order`, then `price-per-guest`); Matias drags the first card, and the factory queues the rest. Merge PR 1, run Seed, check the epic in Jira; PR 2; then the drag.
2. **(Settled in that session; kept for the record.) A mini test from zero, watched end to end:** a small feature, a short design session (`/grill-with-docs`), its tickets, the build, the deploy; GitHub's pipelines, the cards moving in Jira, the page changing. It is also the first live run of PR #32. Settle in the session:
   - **How the tickets get in.** Intake from a design session (STAGE-001-006) is not built: the factory takes only prepared tickets, a `tickets/<id>.md` like `tickets/usd-prices.md` and its card labelled `ticket:<id>` (Seed creates it). Quickest: the session writes the ticket file, a PR merges it, `seed.yml` adds the card to Backlog, then the card moves to Ready.
   - **i18n, if that is the feature.** `AGENTS.md` says the text a visitor reads is in English, so that rule changes first, by the Maintainer. Routing by locale needs `middleware.ts` or `next.config.ts`, which the agent may not write: a language switch in the page, like the currency switch, fits `app/`, `components/` and `lib/`.
   - Expect about 9 minutes from Ready to Merge now that Merge waits for the E2E run (run #27 without it: 285 s of build).
3. **A 10-minute narrative of how the factory was built:** the whole system (the hotel, the factory's relay and stations, Jira with its two accounts, GitHub, Vercel, Anthropic), its flow, and above all measurement, verification, optimization and integrations. In this order:
   1. Read the past sessions thoroughly (episodic memory), the PRs (#1 to #33) and the stage files, for the moments that show the most judgement and growth: decisions changed by evidence, things cut on purpose, failures turned into rules, measured choices.
   2. A `/grill-with-docs` session with Matias to agree on what the narrative stresses.
   3. Then the narrative.
4. **The live run:** KAN-1 (guest-filter) is kept for it; KAN-2 (stay-total) is spare.
5. **Then the epic:** 005 to 013, self-healing first (every retry on 2026-10-21 was by hand). Code review findings 6, 7 and 9 are in the stage file.
6. **Known gap:** closing a PR wakes no `Board` run; the run ends on the next event.
7. **Deferred:** the factory doctor and the Jira admin token; Haiku again, told to run every command in the foreground.
