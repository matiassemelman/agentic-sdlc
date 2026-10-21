# Current Work Status

**Updated:** 2026-10-20

## Active Epic
**EPIC-001:** Factory v0, from a design session to production (reordered 2026-10-20: verification first, people on the loop)
**File:** `docs/epics/epic-001-factory-v0.md`

## Active Stage
**STAGE-001-004:** Build with self-verification, and the spec gate
**File:** `docs/stages/stage-001-004-build.md`
**Phase:** Build: merged in PR #17; first live runs on 2026-10-20 (run #19, KAN-3)

## Context
- **STAGE-001-003 done on 2026-10-20.** The board works live: webhook → relay → `Board`, the spec on the card, approval bound to the hash, the queue, wrong drags put back, rejection, failures that say why. Fixed on the way: the webhook's URL, the Ready and Done columns, the listing lag (GitHub and Jira), the SDK's parser, the spec's limits. Details in its stage file.
- **GitHub App `agentic-sdlc-factory` (id 5404226):** `FACTORY_APP_ID` and `FACTORY_APP_PRIVATE_KEY` are in the `factory` environment, and the key is in `~/.config/agentic-sdlc/factory-app.private-key.pem` (mode 600). Installed on the repo with contents, issues and pull requests write (checked with a JWT, `docs/runbook.md`).
- **Design changed: people on the loop** ([ADR 0001](adr/0001-people-on-the-loop.md)). The factory takes a ticket from Ready to a verified PR by itself. A person decides when it escalates on the card and at the merge. Tickets come from a design session (`/grill-with-docs`), STAGE-001-006. Epic and `design.md` rewritten.
- **Board now:** 10 columns. KAN-1, KAN-2 and KAN-4 in Done (runs #8 closed by hand, #11 rejected, #13 and #15 failed at the spec station, both fixed). KAN-3 in Backlog.
- **Relay:** https://agentic-sdlc-factory.vercel.app (Vercel project `agentic-sdlc-factory`). The webhook secret lives only in `~/.config/agentic-sdlc/jira-webhook-secret` (mode 600) and in Vercel.
- **The Factory account's language must stay English.** Jira translates built-in statuses, and the factory finds statuses by name. Column names are not translated.
- **The private terms live in the `PRIVATE_TERMS` repository variable.** The `repo-checks` job reads them; the file never names them.

## Next Action
Lookups (watch a run, start one, retry a build, Jira ids, the App check, secrets): `docs/runbook.md`.

1. **The first live build of KAN-3 (run #19):** the spec gate approved its spec ($0.067) and started the build. The first build stopped at the agent (`claude-code-action` refuses runs started by `github-actions[bot]`); fixed in PR #20 with `allowed_bots`. The retry is Actions run 39528679299: expect a PR by `agentic-sdlc-factory[bot]` with its evidence, and the card in Gates. Watch it with `scripts/watch-run.sh build.yml 39528357310`.
2. **Close STAGE-001-004:** the ruleset on `main` with `CODEOWNERS` (bypass for the admin's own PRs), the Acceptance column, `/code-review`, the stage's "Done when" checked live, then the docs.
3. **Then the epic, stage by stage, until it is done:** 005 independent gates (CI runs `run-evidence.ts` again), 006 intake from a design session, 007 bug injection, 008 model gates, 009 self-healing (retries), 010 ledger, 011 reset demo, 012 graph, 013 tickets a guest writes. Each stage starts with its design, and Matias decides.
4. **Deferred from the retro:** the factory doctor (item 1) and the Jira admin token (item 2). Live runs check the same setup from the real sources; build them when a setup fault comes back.
