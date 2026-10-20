# Current Work Status

**Updated:** 2026-10-20

## Active Epic
**EPIC-001:** Factory v0, operated from the board
**File:** `docs/epics/epic-001-factory-v0.md`

## Active Stage
**STAGE-001-003:** The Jira board, with prepared tickets
**File:** `docs/stages/stage-001-003-jira-board.md`
**Phase:** Build done (2026-10-20); waiting for Matias's setup, then refinement

## Context
Stage 2 ran for real on 2026-10-20. #4 was rejected (AC-4 checked text the change never shows; the skill was fixed in PR #5). #6 failed on a bad API key. #7 failed on a GitHub 502. #8 waits in `station:spec-approval` and will be approved from the board. The key now lives only in the `factory` environment. The Jira site exists, with the space `SDLC-demo` and its 10 columns.

## Next Action
Matias: tell the space key (set as the `JIRA_PROJECT` variable), merge the stage 3 PR, create the Vercel project for `apps/factory` with its environment variables, create the fine-grained GitHub token, and add the Jira webhook. Then: run `Seed board` (adopting run #8), and approve #8 by moving its card to Build.
