# agentic-sdlc — design

A small-scale software factory, after Uber ("Efficient Software Factory", 2026) and Spotify ("Introducing Spotify Technology", 2026). A visitor plays **Product owner**: orders a ticket for a demo hotel app, approves its spec, accepts it in an ephemeral environment and sends the PR to the **Maintainer** (Matias), who merges it to production. Vocabulary: [`GLOSSARY.md`](../GLOSSARY.md).

Agreed with Matias on 2026-10-15.

## The run (target: 10–12 minutes)

| # | Station | Who | How | Practice it shows |
|---|---|---|---|---|
| 1 | Ticket | Product owner | Picks 1 of 3 fixed tickets in the panel | No free text = no prompt-injection surface |
| 2 | Spec | Opus 5.5 | One API call → `specs/<n>-<slug>.md`, Given/When/Then criteria | Spotify: judgment is the bottleneck |
| 3 | Spec approval | Product owner | Approve or reject (reject closes the ticket) | Humans decide at the cheapest point |
| 4 | Build | Executor model in `claude-code-action` | The only agent loop; writes code + unit and e2e tests, opens the PR | Uber: managed agents |
| 5 | Fast gates | CI | Lint, type check, build, unit tests (~1 min) | Cheapest check first |
| 6 | Ephemeral environment | Vercel | Preview deployment per PR (public for the hotel app) | Per-PR environments |
| 7 | Parallel gates | CI + models | Playwright e2e · eval vs. spec (Opus, one call) · AI code review (Opus, one call, never the model that wrote the code) · agent tester (code-mode: one call writes a Playwright script, CI runs it, one call reads the result; report with screenshots on the PR) | Uber: uReview, E2E with visual validation, code-mode |
| 8 | Self-healing | Executor | A red gate sends its error back to the agent, max 2 retries; then the run asks a person for help | Uber: self-healing CI |
| 9 | Acceptance | Product owner | Sees the ephemeral environment and reports → "Send to Matias" | |
| 10 | Merge | Maintainer | Approves and merges; production deploy | Agent cannot merge |

The panel shows, per station: duration, tokens, USD and cache share; at the end: total cost, total time and the share spent waiting for a person, plus the context-graph subgraph the run touched.

## Tickets (hotel app "Hotel Mirador", fictional, no real brand, no database)

1. Filter rooms by number of guests (UI → e2e).
2. Total stay price with the tourist tax (pure calculation → unit tests). Uses the Balearic tourist-stay tax; amounts to be verified before use.
3. Prices in EUR or USD (formatting → unit + e2e).

Rooms come from a JSON file in the repo.

## Architecture

- Monorepo, two Vercel projects: `apps/hotel` (the only path the agent may change) and `apps/factory` (the panel).
- Orchestration: GitHub Actions + `anthropics/claude-code-action` with Matias's own API key (subscription credentials may not serve other users). Single-shot stations call the Messages API directly.
- State: GitHub is the database (issue labels and comments). The panel reads it through one server route cached for 5 s, shared by every viewer.
- Context: `AGENTS.md` (tool-agnostic; Cursor, Copilot and Gemini read it too), skills versioned in the repo (`write-spec`, `implement-ticket`, `verify`), specs and ADRs as memory.
- Context graph: code (files, exports, imports, tests) plus delivery artifacts (ticket → spec → criterion → test → PR → run → deploy, ADRs). Built deterministically in CI on every merge to `main`, stored as versioned JSON, queried by the agent through a CLI (`graph query …`), not MCP. At this scale it does not pay for itself; the benchmark measures that honestly.
- Design: the hotel site follows the taste skill v2 (`.claude/skills/design-taste-frontend`). That skill is for public pages, not dashboards, so the panel does not use it. The build agent follows the hotel's existing tokens; it does not run the taste skill per ticket.

## Model routing

- Opus 5.5 for judgment: spec, eval, code review.
- Executor: Sonnet 5.5 by default; the benchmark decides whether Haiku 5.5 replaces it (each ticket ×3 per model; pass rate, retries, cost per merged PR, time). The table goes in the README.

## Security

- Fixed tickets only; access code per demo; read-only mode without the code (shows the last complete run, triggers nothing).
- One run at a time; at most 10 runs a day; USD 20 hard limit in the Anthropic console.
- Agent token: branches and PRs only. `main` protected: required gates + Maintainer review via `CODEOWNERS`. No production secrets reachable by the agent.

## Cost (official prices, 2026-10-15)

Per MTok: Opus 5.5 $4 in / $20 out / $0.20 cache hit; Sonnet 5.5 $2 / $10 / $0.10; Haiku 5.5 $0.10 / $0.50 / $0.01 (prompts ≤ 100k). A bare Claude Code session loads ~29.5k tokens before doing anything (measured locally), so only the build station runs as an agent loop.

Estimate per full run: **USD 0.69** with Sonnet as executor, **USD 0.21** with Haiku. 45 runs plus the benchmark: ~USD 36 / ~USD 10. Assumptions: 20 build turns, 20k base context, a retry in 30% of runs; doubling the turns multiplies cost by 2–3. Replace with ledger data after the first 10 runs.

## Measurement

- Run ledger: one line per run (ticket→production time, cost, gates, retries); table in the README.
- `Reset demo` workflow: returns `main` to the `baseline` tag and archives the previous run in a tag. PRs stay in GitHub as evidence.

## Build order

- **v0** — the whole factory, operated from GitHub.
- **v1** — the panel.
- **v2** — "inject a bug" switch; benchmark (executor model, eval precision/recall, with vs. without the graph).

## README

Station diagram mapped to Uber/Spotify practices, routing and ledger tables, "What changes at Uber scale", 3 ADRs (GitHub as the database, `claude-code-action` with an API key, model routing by benchmark).

## Out of scope (told, not built)

Context graph at Uber scale, MCP gateway, measuring feature impact in production (Spotify Confidence), on-call triage, multiple repos, rollback.
