# Current Work Status

**Updated:** 2026-10-15

## Active Epic
**EPIC-001:** Factory v0, operated from GitHub
**File:** `docs/epics/epic-001-factory-v0.md`

## Active Stage
**STAGE-001-001:** Hotel baseline + fast gates + ephemeral environment
**File:** `docs/stages/stage-001-001-hotel-baseline.md`
**Phase:** Refinement (Matias tests)

## Context
Hotel site built with the taste skill v2 (inspector: 0 FAIL; one WARN defended: no video, to keep the repo light). Unit and e2e pass locally. Fonts self-hosted (Google Fonts broke the Turbopack build).

## Next Action
Matias tests the hotel on desktop and phone (production: https://hotel-mirador-rho.vercel.app) and merges PR #1, which proves the loop: fast gates 32 s, Vercel preview, e2e on the preview 42 s. Then STAGE-001-002 (spec station); it needs the Anthropic API key as a repo secret.
