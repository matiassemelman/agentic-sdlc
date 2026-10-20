# EPIC-001: Factory v0, operated from the board

Goal: a ticket travels from the Jira board to production through every station in [`../design.md`](../design.md), with no panel yet. Demoable with guests playing the product owner on the board.

The core of the demo is verification: gates that hold, and an agent that checks its own work. Everything else adds to that (decision, Matias, 2026-10-20).

## Stages

1. **STAGE-001-001** Hotel baseline + fast gates + ephemeral environment + production deploy. Done 2026-10-19.
2. **STAGE-001-002** Spec station and spec approval. Done 2026-10-20; its last fixes shipped with STAGE-001-003.
3. **STAGE-001-003** The Jira board with prepared tickets: webhook relay in `apps/factory`, `board.yml`, the spec and its approval on the card, seeding the board. Closing since 2026-10-20.
4. **STAGE-001-004** Build station with self-verification.
   - `claude-code-action`, repo skills, agent permissions, branch protection, `CODEOWNERS`.
   - A `verify-hotel` skill (launch, check, drive, evidence, clean up, plus a feature map) that the build agent, the tester and people all use.
   - The agent runs every gate in `AGENTS.md` and proves each criterion on the running app before it opens the PR, with the evidence in the PR.
   - The build starts by `workflow_dispatch`, because labels added with `GITHUB_TOKEN` trigger no workflow.
5. **STAGE-001-005** Independent deterministic gates. CI never trusts the agent's report.
   - Criterion coverage: every `AC-n` of the approved spec has a test named with it.
   - Fail-first: the new tests fail on the base code and pass on the change.
   - Scope: only `apps/hotel` changes, and the agent's token cannot change `.github/workflows`.
   - Required checks: a skipped job counts as passed, so a pending or failed deployment must not leave a green check.
6. **STAGE-001-006** Model gates, never run by the model that wrote the code.
   - The eval checks the change against the spec, criterion by criterion, with evidence.
   - The AI code review runs on a different model.
   - The agent tester drives the ephemeral environment from the spec and reports screenshots on the PR and the card.
7. **STAGE-001-007** Self-healing: errors back to the agent, max 2 retries, then escalation on the card.
8. **STAGE-001-008** Gate effectiveness: an "inject a bug" switch plants known defects and measures which gate catches each (precision and recall per gate).
9. **STAGE-001-009** Run ledger and per-station cost: cost per merged change, retries, time waiting on a person.
10. **STAGE-001-010** Context graph built in CI + `graph` CLI.
11. **STAGE-001-011** `Reset demo` workflow: `main` back to the `baseline` tag, the board back to the 3 prepared tickets.
12. **STAGE-001-012** Tickets a product owner writes: the Maintainer's triage, the spec station may refuse, the whole hotel code as context, untrusted text kept apart in the prompt.

Later: tickets born from a design session in Claude Code, via a `file-tickets` skill that writes them to Backlog after the Maintainer confirms them.

Next epics: EPIC-002 panel (v1), EPIC-003 benchmark of executor models (v2).
