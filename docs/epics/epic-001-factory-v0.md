# EPIC-001: Factory v0, operated from GitHub

Goal: a ticket travels from a GitHub issue to production through every station in [`../design.md`](../design.md), with no panel yet. Demoable by screen-sharing GitHub.

## Stages

1. **STAGE-001-001** Hotel baseline + fast gates + ephemeral environment + production deploy.
2. **STAGE-001-002** Spec station and spec approval (labels on the issue).
3. **STAGE-001-003** Build station: `claude-code-action`, `AGENTS.md`, repo skills, agent permissions, branch protection, `CODEOWNERS`.
4. **STAGE-001-004** Eval and AI code review gates.
5. **STAGE-001-005** Agent tester (code-mode Playwright) with a report on the PR.
6. **STAGE-001-006** Self-healing: errors back to the agent, max 2 retries, escalation.
7. **STAGE-001-007** Context graph built in CI + `graph` CLI.
8. **STAGE-001-008** Run ledger and per-station cost.
9. **STAGE-001-009** `Reset demo` workflow and `baseline` tag.

Next epics: EPIC-002 panel (v1), EPIC-003 bug switch + benchmark (v2).
