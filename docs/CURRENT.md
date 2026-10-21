# Current Work Status

**Updated:** 2026-10-21

## Active Epic
**EPIC-001:** Factory v0, from a design session to production (reordered 2026-10-20: verification first, people on the loop)
**File:** `docs/epics/epic-001-factory-v0.md`

## Active Stage
**STAGE-001-004:** Build with self-verification, and the spec gate
**File:** `docs/stages/stage-001-004-build.md`
**Phase:** Works live end to end (KAN-3 in production); closing: the code review's findings, then the docs

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

1. **The live run:** KAN-1 to Ready (drag it, or the MCP's `In Review` transition, id 31). Expect about 7 minutes to Merge: spec ~1, build ~5 (run #27: 285 s), gates ~1. The card is assigned to the Maintainer; he approves and merges PR; the card goes to Done and production changes in under a minute. Watch with `scripts/watch-run.sh board.yml`, then `build.yml`.
2. **Close STAGE-001-004:** apply the `/code-review` findings of 2026-10-21 (every PR since #17); check its "Done when" (all live except a spec with too many assumptions waiting on the card, which only unit tests cover); then the docs.
3. **Then the epic, stage by stage, until it is done:** 005 independent gates (CI runs `run-evidence.ts` again), 006 intake from a design session, 007 bug injection, 008 model gates, 009 self-healing, 010 ledger, 011 reset demo, 012 graph, 013 tickets a guest writes. Each stage starts with its design, and Matias decides. Self-healing first: every retry on 2026-10-21 was by hand (KAN-3 took four builds, KAN-4 three).
4. **Known gap:** closing a PR wakes no `Board` run; the run ends on the next event (a gate finishing, a push to `main`, a card moved).
5. **Deferred:** the factory doctor and the Jira admin token (retro items 1 and 2); Haiku again, told to run every command in the foreground.
