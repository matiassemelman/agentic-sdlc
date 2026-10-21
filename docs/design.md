# agentic-sdlc — design

A small-scale software factory, after Uber ("Efficient Software Factory", 2026) and Spotify ("Introducing Spotify Technology", 2026). The **Maintainer** (Matias) runs a design session that turns an idea for a demo hotel app into an epic of tickets; one drag to Ready queues the whole epic. The factory carries each ticket to a verified pull request on its own: it writes the spec, builds, proves its own work, and passes gates that do not trust it. People decide only when the factory **escalates** on the card, and at the merge to production. Vocabulary: [`GLOSSARY.md`](../GLOSSARY.md).

Agreed with Matias on 2026-10-15. Revised on 2026-10-20: people on the loop, not in it ([ADR 0001](adr/0001-people-on-the-loop.md)), with verification as the core of the demo.

## The run (target: 10–12 minutes)

| # | Station | Who | How | Practice it shows |
|---|---|---|---|---|
| 1 | Design session | Maintainer + agent | `/grill-with-docs` in Claude Code until the idea splits into clear tickets; the epic and its tickets go to Backlog, in order; moving one card to Ready queues the rest behind it | Spotify: judgment is the bottleneck, so people spend it on what to build |
| 2 | Ticket | Factory | Pulls from Ready, oldest first, one run at a time. A ticket a guest writes waits for the Maintainer's triage first | Untrusted text never reaches an agent unread |
| 3 | Spec | Opus 5.5 | One API call, Given/When/Then criteria | |
| 4 | Spec gate | CI | Validation plus a policy: a clear spec goes on, an unclear one (too many assumptions, refused validation) escalates to the card, where a person approves it bound to its hash | People decide only where the evidence is weak |
| 5 | Build | Executor model in `claude-code-action` | The only agent loop: writes code and tests, runs every gate in `AGENTS.md`, proves each criterion on the running app with `verify-hotel`, opens the PR with the evidence | Uber: managed agents; pstack: an agent that verifies its own work |
| 6 | Fast gates | CI | Lint, types, build, unit tests; criterion coverage, fail-first, scope. CI never trusts the agent's report | A check you never saw fail proves nothing |
| 7 | Ephemeral environment | Vercel | Preview deployment per PR (public for the hotel app) | Per-PR environments |
| 8 | Model gates | CI + models | Playwright e2e · eval vs. spec · AI code review (never the model that wrote the code) · agent tester (screenshots on the PR and the card) | Uber: uReview, E2E with visual validation |
| 9 | Self-healing | Executor | A red gate sends its error back to the agent, max 2 retries; then the run escalates to the card | Uber: self-healing CI |
| 10 | Merge | Maintainer | Reads the evidence on the PR, merges; production deploy | The one-way door stays a person's; the agent cannot merge |

Gate effectiveness is measured, not assumed: an "inject a bug" switch plants known defects, and each gate reports what it caught (precision and recall, as Uber measures uReview).

The panel shows, per station: duration, tokens, USD and cache share; at the end: total cost, total time and the share spent waiting for a person, plus the context-graph subgraph the run touched.

## Tickets (hotel app "Hotel Mirador", fictional, no real brand, no database)

1. Filter rooms by number of guests (UI → e2e).
2. Total stay price with the tourist tax (pure calculation → unit tests). Uses the Balearic tourist-stay tax; amounts to be verified before use.
3. Prices in EUR or USD (formatting → unit + e2e).

Rooms come from a JSON file in the repo.

## Architecture

- Monorepo, two Vercel projects: `apps/hotel` (the only path the agent may change) and `apps/factory` (the panel).
- Orchestration: GitHub Actions + `anthropics/claude-code-action` with Matias's own API key (subscription credentials may not serve other users). Single-shot stations call the Messages API directly.
- People watch the board and answer escalations there: a Jira kanban whose eight columns are the stations and queues (`Backlog → Ready → Spec → Spec review → Build → Gates → Merge → Done`). Spec review holds only a spec the spec gate escalates. Triage and Acceptance were dropped on 2026-10-21: nothing used them; Triage comes back with the tickets a guest writes (STAGE-001-013). The factory works on GitHub: each run is an issue whose labels and comments are its record. Each side writes only its own data.
- From the board to GitHub: a signed Jira webhook → a relay in `apps/factory` (Vercel) → the `Board` workflow (`workflow_dispatch`). The workflow reads the board and GitHub and brings them into line (reconciliation), so a lost, repeated or forged message changes nothing. No Jira automation: Free allows 150 steps a month.
- The panel (v1) reads GitHub through one server route cached for 5 s, shared by every viewer.
- Context: `AGENTS.md` (tool-agnostic; Cursor, Copilot and Gemini read it too), skills versioned in the repo (`write-spec`, `implement-ticket`, `verify`), specs and ADRs as memory.
- Context graph: code (files, exports, imports, tests) plus delivery artifacts (ticket → spec → criterion → test → PR → run → deploy, ADRs). Built deterministically in CI on every merge to `main`, stored as versioned JSON, queried by the agent through a CLI (`graph query …`), not MCP. At this scale it does not pay for itself; the benchmark measures that honestly.
- Design: the hotel site follows the taste skill v2 (`.claude/skills/design-taste-frontend`). That skill is for public pages, not dashboards, so the panel does not use it. The build agent follows the hotel's existing tokens; it does not run the taste skill per ticket.

## Model routing

- Opus 5.5 for judgment: spec, eval, code review.
- Executor: Sonnet 5.5 by default; the benchmark decides whether Haiku 5.5 replaces it (each ticket ×3 per model; pass rate, retries, cost per merged PR, time). The table goes in the README.

## Security

- Prepared tickets: the factory reads their text from `tickets/`, never from the card, because on Jira Free every user administers every space and can edit any card. Guests are invited as Jira users (Free has no public access); `Reset demo` restores the board.
- One run at a time; at most 20 runs a day (10 until 2026-10-21, when the live tests used nine); USD 18 monthly spend limit in the Anthropic console.
- Agent token: branches and PRs only. `main` protected: required gates + Maintainer review via `CODEOWNERS`. No production secrets reachable by the agent.
- The Anthropic API key and the Factory account's Jira token live in the GitHub environment `factory`, which only `main` may use. Workflows that run pull-request code (e2e on previews) get no secrets. The relay holds only the webhook secret and a GitHub token that can dispatch workflows on this repository.
- A person's approval of an escalated spec is bound to the spec's SHA-256: it counts only if the run issue holds the unchanged spec and the card shows that same spec, unedited. Moves made by the Factory account are never taken as decisions.

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
