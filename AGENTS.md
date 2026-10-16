# AGENTS.md

Instructions for any coding agent (Claude Code, Cursor, Copilot, Gemini) working in this repository.

## What this is

`agentic-sdlc` is a small software factory. A visitor orders a ticket for a demo hotel app; agents write the spec and the code; gates and people decide what reaches production. Design: `docs/design.md`. Vocabulary: `GLOSSARY.md` (use its terms).

## Layout

- `apps/hotel`: Hotel Mirador, a fictional hotel site (Next.js 16, TypeScript). **The only app an agent may change.** Next.js 16 has breaking changes: read `apps/hotel/AGENTS.md` and the docs it points to before writing Next code.
  - `data/rooms.json`: the rooms. There is no database.
  - `lib/`: pure logic, each module with a `*.test.ts` beside it.
  - `components/`, `app/`: the page.
  - `e2e/`: Playwright tests.
- `.claude/skills/`: skills shared by local and cloud agents.
- `docs/`: design, epics, stages, ADRs.

## Commands (from the repo root)

| Gate | Command |
|---|---|
| Lint | `pnpm lint` |
| Types | `pnpm typecheck` |
| Unit tests | `pnpm test` |
| Build | `pnpm build` |
| Design house rules | `node .claude/skills/design-taste-frontend/scripts/lint.mjs apps/hotel/app apps/hotel/components` |
| E2E (local build) | `pnpm --filter hotel e2e` |

A change is done when every gate passes.

## Rules for changes to the hotel

- Keep logic in `lib/` as pure functions with unit tests; keep components thin.
- Every acceptance criterion in the spec gets a test: unit for logic, e2e for what a visitor sees.
- Use the design tokens in `apps/hotel/app/globals.css`; add no new colours, fonts or sizes. Follow the house rules in `.claude/skills/design-taste-frontend/SKILL.md` ("House rules"); do not run the full art-direction process for a ticket.
- Dates are plain calendar dates (`YYYY-MM-DD`), with no time and no time zone. Nights are the difference in calendar days; check-out must be after check-in.
- Prices are whole euros in the data; format them only through `lib/format.ts`.
- Text a visitor reads is in English.
