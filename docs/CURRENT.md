# Current Work Status

**Updated:** 2026-10-20

## Active Epic
**EPIC-001:** Factory v0, from a design session to production (reordered 2026-10-20: verification first, people on the loop)
**File:** `docs/epics/epic-001-factory-v0.md`

## Active Stage
**STAGE-001-004:** Build with self-verification, and the spec gate
**File:** `docs/stages/stage-001-004-build.md`
**Phase:** Build (design decided 2026-10-20: self-verification with evidence, spec gate escalates only soft problems)

## Context
- **STAGE-001-003 done on 2026-10-20.** The board works live: webhook → relay → `Board`, the spec on the card, approval bound to the hash, the queue, wrong drags put back, rejection, failures that say why. Fixed on the way: the webhook's URL, the Ready and Done columns, the listing lag (GitHub and Jira), the SDK's parser, the spec's limits. Details in its stage file.
- **Design changed: people on the loop** ([ADR 0001](adr/0001-people-on-the-loop.md)). The factory takes a ticket from Ready to a verified PR by itself. A person decides when it escalates on the card and at the merge. Tickets come from a design session (`/grill-with-docs`), STAGE-001-006. Epic and `design.md` rewritten.
- **Board now:** 10 columns. KAN-1, KAN-2 and KAN-4 in Done (runs #8 closed by hand, #11 rejected, #13 and #15 failed at the spec station, both fixed). KAN-3 in Backlog. Runs in the last 24 h: 7 of 10.
- **Relay:** https://agentic-sdlc-factory.vercel.app (Vercel project `agentic-sdlc-factory`). The webhook secret lives only in `~/.config/agentic-sdlc/jira-webhook-secret` (mode 600) and in Vercel.
- **The Factory account's language must stay English.** Jira translates built-in statuses, and the factory finds statuses by name. Column names are not translated.
- **The private terms live in the `PRIVATE_TERMS` repository variable.** The `repo-checks` job reads them; the file never names them.

## Next Action
1. Matias merges PR #16 (stage 3 closed, ADR 0001).
2. Matias creates the factory's GitHub App and saves its ID and key in the `factory` environment (stage file, "Matias does").
3. Build STAGE-001-004 in its order: the spec gate, `verify-hotel`, `implement-ticket`, `build.yml`, protection. Branch `stage-001-004-build`.
4. Invite the first guest to Jira as a User (not site admin) once the factory runs on its own.
