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
- **PR #10 is open and green** (branch `stage-001-003-close`). It holds:
  - the epic reordered around verification;
  - the retro guardrails: seed diagnostics, `actionlint`, the private-terms check, `jira-scopes.ts`, `show-spec.sh`;
  - this handoff.

  Until it merges, `main` has an older copy of this file.
- **The private terms live in the `PRIVATE_TERMS` repository variable.** The `repo-checks` job reads them, and the file never names them.

## Next Action
1. Matias sets `GITHUB_DISPATCH_TOKEN` in Vercel (Production, Sensitive): https://vercel.com/matiassemelmans-projects/agentic-sdlc-factory/settings/environment-variables
2. Matias merges PR #10. The merge deploys the relay to production, which picks up the token. Check: a signed test POST to `/api/jira` dispatches `Board`.
3. Live test: Matias drags KAN-4 from Spec review to Build. Check that the webhook woke `Board` (Actions) and that #8 moved to `station:build` with a `factory:approved` marker (`scripts/show-spec.sh 8`, then the issue's last comment).
4. Close #8 by hand: no build station exists yet, so it keeps the factory busy. Then test the queue, a wrong drag, and take plus reject with KAN-1 (about $0.07).
5. `/code-review` of stage 3's code (PR #9's diff), fix what it finds, and mark the stage done in the epic and here.
6. Invite the first guest product owner to Jira as a User (not site admin), after the live test.
7. Next stage: STAGE-001-004, build with self-verification. Design comes first, with Matias deciding.
