# Current Work Status

**Updated:** 2026-10-20

## Active Epic
**EPIC-001:** Factory v0, operated from the board (reordered 2026-10-20: verification is the core)
**File:** `docs/epics/epic-001-factory-v0.md`

## Active Stage
**STAGE-001-003:** The Jira board, with prepared tickets
**File:** `docs/stages/stage-001-003-jira-board.md`
**Phase:** Closing: PR #12 merged; the spec station's fix waits for its merge, then the live check

## Context
- **Merged in PRs #9 and #10.** The board workflow `board.yml`, `seed.yml`, the relay `apps/factory`, the reordered epic and the retro guardrails (seed diagnostics, `actionlint`, the private-terms check, `jira-scopes.ts`, `show-spec.sh`) are on main.
- **Board seeded on 2026-10-20.** KAN-1, KAN-2 and KAN-3 (the prepared tickets) are in Backlog. KAN-4 is run #8's card, in Spec review. #8 was renamed `KAN-4: ...`.
- **Relay live at https://agentic-sdlc-factory.vercel.app.**
  - Vercel project `agentic-sdlc-factory` (`prj_OvD0LwwK1DLaLZW8DXPsZ6CcHpoS`), root directory `apps/factory`.
  - All five variables are set, `GITHUB_DISPATCH_TOKEN` included (2026-10-20).
  - **Relay → Board verified on 2026-10-20:** a signed test POST to `/api/jira` answered 200 and dispatched `Board`, which ran green with no actions.
  - The webhook secret lives only in `~/.config/agentic-sdlc/jira-webhook-secret` (mode 600) and in Vercel.
- **Jira webhook fixed and verified on 2026-10-20.** Issue updated, JQL `project = KAN`. Its URL pointed at Jira's own webhooks page, so no real event ever reached the relay; the signed test POST had not covered Jira's side. Now `https://agentic-sdlc-factory.vercel.app/api/jira`: a real drag reached the relay (`Atlassian Webhook HTTP Client`, 200) and dispatched `Board`.
- **Live test on 2026-10-20** (details in the stage's Refinement): approval bound to the hash (KAN-4, #8), a repeated look that changes nothing, take with the spec on the card in 46 s (KAN-1, #11, $0.074), the queue note, both wrong drags put back, and a rejection (#11 closed as rejected).
- **Board now:** columns Ready and Done added (10 columns). KAN-1, KAN-2 and KAN-4 in Done: #8 closed by hand, #11 rejected, #13 failed at the spec station (the SDK's parser, fixed on the branch). KAN-3 in Backlog.
- **The Factory account's language must stay English.** Jira translates its built-in statuses (Done, Ready) into the reader's language, and the factory finds statuses by name.
- **The private terms live in the `PRIVATE_TERMS` repository variable.** The `repo-checks` job reads them, and the file never names them.

## Next Action
1. Matias merges the PR with the spec station's fix (`answerOf`) and the columns' notes.
2. Then the live check of PRs #12 and this one, from the board:
   - KAN-2 to Ready: the factory takes it and posts its spec (the station's fix).
   - Edit KAN-2's spec on the card and move it to Build: the approval must be refused.
   - KAN-3 to Ready: it waits, with a note.
   - KAN-2 to Done: the same pass must take KAN-3 (the listing-lag fix).
   About $0.15; runs in the last 24 h: 6 of 10.
3. Mark the stage done in the epic and here.
4. Invite the first guest product owner to Jira as a User (not site admin).
5. Next stage: STAGE-001-004, build with self-verification. Design comes first, with Matias deciding.
