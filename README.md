# agentic-sdlc

A small-scale software factory, after Uber ([Efficient Software Factory](https://www.uber.com/gb/en/blog/efficient-software-factory/)) and Spotify ([Introducing Spotify Technology](https://technology.spotify.com/blog/introducing-spotify-technology)).

A visitor orders a change to a demo hotel site, approves its spec, accepts it in an ephemeral environment and sends the pull request to the maintainer, who merges it to production. Agents write the spec and the code; gates and people decide what moves forward.

**Status:** v0 in progress, stage 1 of 9 (hotel site, fast gates, ephemeral environment). Live: [hotel-mirador-rho.vercel.app](https://hotel-mirador-rho.vercel.app). Design: [`docs/design.md`](docs/design.md). Vocabulary: [`GLOSSARY.md`](GLOSSARY.md).

## The hotel

`apps/hotel` is Hotel Mirador, a fictional four-room hotel in Palma de Mallorca. It has no database: the rooms live in `data/rooms.json`. Its design follows [taste-skill](https://github.com/Leonxlnx/taste-skill) v2 (MIT), installed in `.claude/skills/design-taste-frontend`.

## Gates today

| Gate | Where |
|---|---|
| Lint, types, unit tests, build, design house rules | `.github/workflows/gates.yml`, on every PR |
| E2E (Playwright: desktop, Android phone, 375px iPhone in WebKit) | `.github/workflows/e2e.yml`, on every preview deployment and on production |
