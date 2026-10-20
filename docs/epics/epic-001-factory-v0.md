# EPIC-001: Factory v0, operated from the board

Goal: a ticket travels from the Jira board to production through every station in [`../design.md`](../design.md), with no panel yet. Demoable with guests playing the product owner on the board.

## Stages

1. **STAGE-001-001** Hotel baseline + fast gates + ephemeral environment + production deploy. Done 2026-10-19.
2. **STAGE-001-002** Spec station and spec approval (labels on the issue). First real runs 2026-10-20; its last fixes close with STAGE-001-003.
3. **STAGE-001-003** The Jira board with prepared tickets: webhook relay in `apps/factory`, `board.yml`, the spec and its approval on the card, seeding the board. In design since 2026-10-20.
4. **STAGE-001-004** Tickets a product owner writes: triage by the Maintainer, the spec station may refuse, the whole hotel code as context, untrusted text kept apart in the prompt.
5. **STAGE-001-005** Build station: `claude-code-action`, `AGENTS.md`, repo skills, agent permissions, branch protection, `CODEOWNERS`.
   - A gate fails when a change touches anything outside `apps/hotel`, and the agent's token cannot change `.github/workflows`.
   - Before E2E becomes a required check: a skipped job counts as passed, so a pending or failed deployment must not leave a green check.
   - The build starts by `workflow_dispatch`, because labels added with `GITHUB_TOKEN` trigger no workflow.
6. **STAGE-001-006** Eval and AI code review gates.
7. **STAGE-001-007** Agent tester (code-mode Playwright) with a report on the PR.
8. **STAGE-001-008** Self-healing: errors back to the agent, max 2 retries, escalation.
9. **STAGE-001-009** Context graph built in CI + `graph` CLI.
10. **STAGE-001-010** Run ledger and per-station cost.
11. **STAGE-001-011** `Reset demo` workflow: `main` back to the `baseline` tag, the board back to the 3 prepared tickets.

Later, after the demo flow: tickets born from a design session in Claude Code (a `file-tickets` skill that writes them to Backlog after the Maintainer confirms them).

Next epics: EPIC-002 panel (v1), EPIC-003 bug switch + benchmark (v2).
