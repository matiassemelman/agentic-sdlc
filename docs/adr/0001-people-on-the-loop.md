---
status: accepted
---

# People on the loop, not in it

The first design (2026-10-15) put a person at every decision of a run: a product owner moved the ticket to Ready, approved the spec and accepted the change, and the Maintainer merged it. The live test of the board (2026-10-20) showed what that demo is: a person moving cards on a kanban with agents inside, which says nothing about whether the factory can be trusted on its own. We decided that the factory carries a ticket from Ready to a verified pull request by itself, and a person decides only when the factory **escalates**, because its own evidence is not enough, or when the change goes to production, the one decision that cannot be walked back (Matias, 2026-10-20).

## Consequences

- Autonomy is earned by verification: the build agent proves its own work, and independent gates do not trust its report. Verification stays the first thing built.
- The spec is approved by a gate. A spec beyond the gate's policy (too many assumptions, a refused validation) goes to a person on the card instead of ending the run. The approval bound to the spec's SHA-256 stays, for those escalations.
- Tickets come from a design session the Maintainer runs, filed as an epic in Ready. A ticket a guest writes still goes through the Maintainer's triage, since its text is untrusted.
- Accepting the change in its ephemeral environment stops being a person's station: the agent tester's evidence goes on the pull request, where the Maintainer reads it before merging.
