# Current Work Status

**Updated:** 2026-10-20

## Active Epic
**EPIC-001:** Factory v0, operated from GitHub
**File:** `docs/epics/epic-001-factory-v0.md`

## Active Stage
**STAGE-001-002:** Spec station and spec approval
**File:** `docs/stages/stage-001-002-spec-station.md`
**Phase:** Refinement (Matias tests)

## Context
Stage 1 closed on 2026-10-19 (review fixes in PR #2). Stage 2 is built: the 3 tickets, `packages/stations` (spec station, validator, renderer, admission; unit tests in the fast gates), the `write-spec` skill and the `Order a ticket` and `Spec approval` workflows. The `factory` environment exists and only `main` can use it. First real run on 2026-10-20 (#4): a valid spec in 24 s for $0.070; Matias rejected it because AC-4 checked text the change never shows. Refusal of a second order works. Refinement fixes are in the stage doc.

## Next Action
Matias moves the API key into the `factory` environment and deletes the repo secret (the key is still a repo secret), then merges the refinement PR. Then: order `guest-filter` again and, if the spec is right, approve it with `spec:approved`; check the issue moves to `station:build`.
