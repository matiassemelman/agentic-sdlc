# STAGE-001-001: Hotel baseline + fast gates + ephemeral environment

## Scope
- pnpm monorepo: `apps/hotel` (Next.js, TypeScript), rooms in `apps/hotel/data/rooms.json`, no database.
- Hotel Mirador single page designed with the taste skill v2.
- CI on every PR: lint, type check, build, unit tests (Vitest); Playwright e2e against the Vercel preview.
- Vercel project for `apps/hotel`: preview per PR (protection off), production on `main`.

## UX gate (confirmed by Matias, 2026-10-16)
Calendar dates without time zone; works at 375px; AA contrast and visible focus; empty states defined by each spec; no fake booking button; fictional-hotel notice in the footer; public-domain/CC pictures with credits; booking, payments, availability, login and other languages out of scope.

## Decisions during build
- Direction: split stage (seed 1887595604); rooms section redrawn to "sticky photograph, active list" because four rooms need their full details visible.
- Palette: dealt proportions, colours from the subject (lime-washed stone, shutter green).
- Room descriptions stay open (no expand on scroll) to avoid layout shift.
- On a phone the window is not sticky; each room shows its own view.
- Fonts self-hosted (OFL); pictures credited in the footer.

## Needs Matias
- Nothing for now: push goes over SSH; Vercel CLI is logged in.
