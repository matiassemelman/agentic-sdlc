# agentic-sdlc

A small-scale software factory, after Uber ([Efficient Software Factory](https://www.uber.com/gb/en/blog/efficient-software-factory/)) and Spotify ([Introducing Spotify Technology](https://technology.spotify.com/blog/introducing-spotify-technology)).

A person moves a ticket for a demo hotel site to Ready on a Jira board. The factory carries it to a verified pull request on its own: it writes the spec, builds the change with tests and runs the gates, with a preview deployment for every pull request. A person steps in when the spec gate escalates on the card, and at the merge to production. Agents write the spec and the code; gates and people decide what moves forward.

**Status:** v0 in progress (13 stages, [`docs/epics/epic-001-factory-v0.md`](docs/epics/epic-001-factory-v0.md)). Built and run live: the hotel site, fast gates, ephemeral environments, the spec station, the Jira board, the build station and the epic queue. On 2026-10-21 one drag on the board took two tickets from Ready to pull requests with every gate green (#40 and #42). Next: self-healing. Current state: [`docs/CURRENT.md`](docs/CURRENT.md). Live: [hotel-mirador-rho.vercel.app](https://hotel-mirador-rho.vercel.app). Design: [`docs/design.md`](docs/design.md). Vocabulary: [`GLOSSARY.md`](GLOSSARY.md).

## The hotel

`apps/hotel` is Hotel Mirador, a fictional four-room hotel in Palma de Mallorca. It has no database: the rooms live in `data/rooms.json`. Its design follows [taste-skill](https://github.com/Leonxlnx/taste-skill) v2 (MIT), installed in `.claude/skills/design-taste-frontend`.

## Gates today

| Gate | Where |
|---|---|
| Lint, types, unit tests, build, design house rules | `.github/workflows/gates.yml`, on every PR |
| E2E (Playwright: desktop, Android phone, 375px iPhone in WebKit) | `.github/workflows/e2e.yml`, on every preview deployment and on production |
| Workflow lint (actionlint with shellcheck), private terms in files and new commit messages | `.github/workflows/gates.yml`, on every PR |

## The factory today

| Piece | Where |
|---|---|
| The board's webhook → the factory | `apps/factory` (relay on Vercel) → `.github/workflows/board.yml` |
| Taking a ticket, the spec station (Opus 5.5, one call), approval on the board | `packages/stations` (`board.ts` decides, `factory.ts` acts) |
| The build station: the executor model (Sonnet 5.5 by default) in `claude-code-action` writes the code and its tests, runs the gates and opens the pull request | `.github/workflows/build.yml` |
| The epic queue: one drag to Ready brings the epic's other tickets behind it | `packages/stations` (`board.ts`) |
| Preparing the board | `.github/workflows/seed.yml` |
