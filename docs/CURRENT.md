# Current Work Status

**Updated:** 2026-10-19

## Active Epic
**EPIC-001:** Factory v0, operated from GitHub
**File:** `docs/epics/epic-001-factory-v0.md`

## Active Stage
**STAGE-001-002:** Spec station and spec approval
**File:** `docs/stages/stage-001-002-spec-station.md`
**Phase:** Refinement (Matias tests)

## Context
Stage 1 closed on 2026-10-19 (review fixes in PR #2). Stage 2 is built: the 3 tickets, `packages/stations` (spec station, validator, renderer, admission; unit tests in the fast gates), the `write-spec` skill and the `Order a ticket` and `Spec approval` workflows. The `factory` environment exists and only `main` can use it. The real Opus call has not run yet: it can only run from `main`.

## Next Action
Matias does four things. He moves the API key into the `factory` environment and deletes the repo secret. He sets the USD 20 spend limit. He merges PR #2 and then the stage 2 PR. Then: order `guest-filter` from Actions, read the spec on the issue, and approve it with `spec:approved`.
