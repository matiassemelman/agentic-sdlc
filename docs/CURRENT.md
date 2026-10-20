# Current Work Status

**Updated:** 2026-10-20

## Active Epic
**EPIC-001:** Factory v0, operated from the board (reordered 2026-10-20: verification is the core)
**File:** `docs/epics/epic-001-factory-v0.md`

## Active Stage
**STAGE-001-003:** The Jira board, with prepared tickets
**File:** `docs/stages/stage-001-003-jira-board.md`
**Phase:** Refinement: live test on the board pending

## Context
- **Merged in PR #9.** The board workflow `board.yml`, `seed.yml` and the relay `apps/factory` are on main.
- **Board seeded on 2026-10-20.** KAN-1, KAN-2 and KAN-3 (the prepared tickets) are in Backlog. KAN-4 is run #8's card, in Spec review. #8 was renamed `KAN-4: ...`.
- **Relay live at https://agentic-sdlc-factory.vercel.app.**
  - Vercel project `agentic-sdlc-factory` (`prj_OvD0LwwK1DLaLZW8DXPsZ6CcHpoS`), root directory `apps/factory`.
  - Four of its five variables are set. `GITHUB_DISPATCH_TOKEN` is missing.
  - The webhook secret lives only in `~/.config/agentic-sdlc/jira-webhook-secret` (mode 600) and in Vercel.
- **Jira webhook created.** Issue updated, JQL `project = KAN`, pointing at `/api/jira`.
- **The Factory account's language must stay English.** Jira translates its built-in statuses (Done, Ready) into the reader's language, and the factory finds statuses by name.
- **Branch `stage-001-003-close`** (local) holds the epic reordered around verification and the stage doc's token-scope fix.

## Next Action
1. Matias sets `GITHUB_DISPATCH_TOKEN` in Vercel (Production, Sensitive). Then redeploy: `vercel api /v13/deployments -X POST` with `gitSource` main for project `agentic-sdlc-factory`.
2. Live test: Matias drags KAN-4 from Spec review to Build. Check that the webhook woke `Board` and that #8 moved to `station:build` with a `factory:approved` marker.
3. Close #8 by hand: no build station exists yet, so it keeps the factory busy. Then test the queue, a wrong drag, and take plus reject with KAN-1 (about $0.07).
4. `/code-review` of stage 3, then merge the close PR (it already carries the retro guardrails: seed diagnostics, `actionlint`, the private-terms check, `jira-scopes.ts`, `show-spec.sh`).
5. Invite the first guest product owner to Jira as a User (not site admin), after the live test.
