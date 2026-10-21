# EPIC-001: Factory v0, from a design session to production

Goal: an idea goes from a design session to production through every station in [`../design.md`](../design.md). The factory runs on its own; people decide only when it escalates and at the merge.

## Decisions
- **Verification is the core of the demo** (Matias, 2026-10-20): gates that hold, and an agent that checks its own work. Everything else adds to that.
- **People on the loop, not in it** (Matias, 2026-10-20, [ADR 0001](../adr/0001-people-on-the-loop.md)). The live test of the board showed a person moving cards on a kanban. The factory takes a ticket to a verified PR by itself and escalates when its evidence is weak. The merge to production stays a person's.

## Stages

1. **STAGE-001-001** Hotel baseline + fast gates + ephemeral environment + production deploy. Done 2026-10-19.
2. **STAGE-001-002** Spec station and spec approval. Done 2026-10-20; its last fixes shipped with STAGE-001-003.
3. **STAGE-001-003** The Jira board: webhook relay, `board.yml`, the spec on the card, seeding, reconciliation that survives lagging listings. Done 2026-10-20.
4. **STAGE-001-004** Build with self-verification, and the spec gate.
   - The spec gate: a clear spec goes on to the build; an unclear one escalates to the card.
   - `claude-code-action`, repo skills, agent permissions, branch protection, `CODEOWNERS`.
   - A `verify-hotel` skill (launch, check, drive, evidence, clean up, plus a feature map) that the build agent, the tester and people all use.
   - The agent runs every gate in `AGENTS.md` and proves each criterion on the running app before it opens the PR, with the evidence in the PR.
   - The build starts by `workflow_dispatch`, because labels added with `GITHUB_TOKEN` trigger no workflow. It must be idempotent: a look that starts during GitHub's lag can see the approval again.
5. **STAGE-001-005** Independent deterministic gates. CI never trusts the agent's report.
   - Criterion coverage: every `AC-n` of the approved spec has a test named with it.
   - Fail-first: the new tests fail on the base code and pass on the change.
   - Scope: only `apps/hotel` changes, and the agent's token cannot change `.github/workflows`.
   - Required checks: a skipped job counts as passed, so a pending or failed deployment must not leave a green check.
6. **STAGE-001-006** Intake: a design session (`/grill-with-docs`) files an epic and its tickets in Ready, and the factory starts on its own.
7. **STAGE-001-007** Gate effectiveness: an "inject a bug" switch plants known defects and measures which gate catches each (precision and recall per gate).
8. **STAGE-001-008** Model gates, never run by the model that wrote the code.
   - The eval checks the change against the spec, criterion by criterion, with evidence.
   - The AI code review runs on a different model.
   - The agent tester drives the ephemeral environment from the spec and reports screenshots on the PR and the card.
9. **STAGE-001-009** Self-healing: errors back to the agent, max 2 retries, then escalation on the card.
10. **STAGE-001-010** Run ledger and per-station cost: cost per merged change, retries, time waiting on a person.
11. **STAGE-001-011** `Reset demo` workflow: `main` back to the `baseline` tag, the board back to its starting tickets.
12. **STAGE-001-012** Context graph built in CI + `graph` CLI.
13. **STAGE-001-013** Tickets a guest writes: the Maintainer's triage, the spec station may refuse, the whole hotel code as context, untrusted text kept apart in the prompt.

Next epics: EPIC-002 panel (v1), EPIC-003 benchmark of executor models (v2).
