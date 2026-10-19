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

## Result (closed 2026-10-19)
- PR #1 merged by Matias after testing on desktop and phone. Fast gates 27 s, e2e on the preview 48 s, e2e on production 43 s.
- Production: https://hotel-mirador-rho.vercel.app
- Vercel needed two changes from its defaults: preview protection off, and GitHub deployment events on (the e2e workflow listens to `deployment_status`). Projects the change does not touch are skipped ("Not affected").

## Close review (2026-10-19)
Fixed in PR #2. Each new test was run against the old code first and failed there.
- The focus ring on the hero button was invisible: green on green.
- Content stayed hidden when the page script failed. The page now opts in to hiding only once the script runs. This also removes the head script and its hydration warning.
- Local e2e reused any server already on :3100 (a stale one was running). It now always builds fresh.
- The e2e workflow runs deployed code, so it gets no git credentials, no cache and no secrets, and it runs only for Vercel's own deployments.
- Smaller fixes:
  - Third-party actions pinned to a SHA.
  - Runs on `main` are never cancelled.
  - Rooms keep their colour transition.
  - 800px is phone layout only.
  - The window copes with an empty room list.
  - Credits come from one file, with linked licences.
  - A `<main>` landmark.
  - `getRooms()` returns a copy.
- New e2e:
  - A jump past sections.
  - Script blocked.
  - Focus ring.
  - A 375px iPhone project in WebKit.

Deferred, with their stage:
- **STAGE-001-002:** the API key goes in a GitHub environment that only `main` can use. Workflows that run pull-request code never get secrets.
- **STAGE-001-003:** a skipped job counts as passed for required checks. Before E2E becomes required, a pending or failed deployment must not leave a green "E2E" check.
- **Ticket 2:** `formatPrice` shows whole euros only. The tourist tax has cents, so the ticket's spec must cover the format.

## Lesson: a gate that could not see the bug
Matias found room rows invisible on open. Two causes: React rewrote the rows' `className` and dropped the reveal class; a jump or fast scroll skipped elements, so they stayed hidden. Playwright counts `opacity: 0` as visible, so the e2e passed. Fix: the reveal state lives in a `data-revealed` attribute, and anything in view or above it is revealed. Two e2e tests now assert computed opacity, one across every animated element; both failed on the old code first.
