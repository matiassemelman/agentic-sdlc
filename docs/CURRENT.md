# Current Work Status

**Updated:** 2026-10-20

## Active Epic
**EPIC-001:** Factory v0, from a design session to production (reordered 2026-10-20: verification first, people on the loop)
**File:** `docs/epics/epic-001-factory-v0.md`

## Active Stage
**STAGE-001-004:** Build with self-verification, and the spec gate
**File:** `docs/stages/stage-001-004-build.md`
**Phase:** Build: merged in PR #17, tested offline; the first live run comes after the retro's improvements

## Context
- **STAGE-001-003 done on 2026-10-20.** The board works live: webhook → relay → `Board`, the spec on the card, approval bound to the hash, the queue, wrong drags put back, rejection, failures that say why. Fixed on the way: the webhook's URL, the Ready and Done columns, the listing lag (GitHub and Jira), the SDK's parser, the spec's limits. Details in its stage file.
- **GitHub App `agentic-sdlc-factory` (id 5404226):** `FACTORY_APP_ID` and `FACTORY_APP_PRIVATE_KEY` are in the `factory` environment, and the key is in `~/.config/agentic-sdlc/factory-app.private-key.pem` (mode 600). Matias installed it on the repo at the end of the session; that was not checked yet (the doctor checks it).
- **Design changed: people on the loop** ([ADR 0001](adr/0001-people-on-the-loop.md)). The factory takes a ticket from Ready to a verified PR by itself. A person decides when it escalates on the card and at the merge. Tickets come from a design session (`/grill-with-docs`), STAGE-001-006. Epic and `design.md` rewritten.
- **Board now:** 10 columns. KAN-1, KAN-2 and KAN-4 in Done (runs #8 closed by hand, #11 rejected, #13 and #15 failed at the spec station, both fixed). KAN-3 in Backlog.
- **Relay:** https://agentic-sdlc-factory.vercel.app (Vercel project `agentic-sdlc-factory`). The webhook secret lives only in `~/.config/agentic-sdlc/jira-webhook-secret` (mode 600) and in Vercel.
- **The Factory account's language must stay English.** Jira translates built-in statuses, and the factory finds statuses by name. Column names are not translated.
- **The private terms live in the `PRIVATE_TERMS` repository variable.** The `repo-checks` job reads them; the file never names them.

## Next Action
1. **Apply the retro** of 2026-10-20, in its order: `docs/retros/2026-10-20-board-live-test.md`.
   - The factory doctor (`doctor.yml`) comes first, then read access to Jira's admin settings (Matias makes the token), `scripts/watch-run.sh`, `CODING_STANDARDS.md`, `pnpm lint:workflows` and `docs/runbook.md`.
   - Each item says when it is done.
2. **Run the doctor** until it passes: the App's installation, the environment, the columns, the Factory account's locale, the webhook.
3. **First live build:** KAN-3 (usd-prices) to Ready. Expect, with no person: spec gate → `build.yml` → a PR by `agentic-sdlc-factory[bot]` with its evidence (each criterion red on `main` and green with the change, screenshots) → the gates run on the PR → the card in Gates. Watch with `scripts/watch-run.sh`.
4. **Close STAGE-001-004:** the ruleset on `main` with `CODEOWNERS` (bypass for the admin's own PRs), the Acceptance column, `/code-review`, the stage's "Done when" checked live, then the docs.
5. **Then the epic, stage by stage, until it is done:** 005 independent gates (CI runs `run-evidence.ts` again), 006 intake from a design session, 007 bug injection, 008 model gates, 009 self-healing, 010 ledger, 011 reset demo, 012 graph, 013 tickets a guest writes. Each stage starts with its design, and Matias decides.
