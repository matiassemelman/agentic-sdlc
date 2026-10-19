# STAGE-001-002: Spec station and spec approval

## Decisions (Matias, 2026-10-19)
- **D1. Ticket entry point:** an "Order a ticket" workflow (`workflow_dispatch` with a choice of the 3 tickets) opens the issue with the ticket's fixed text from `tickets/`. There is no free text anywhere. In v1 the panel dispatches the same workflow.
- **D2. Where the spec waits:** a comment on the issue. A person approves or rejects it with the label `spec:approved` or `spec:rejected`.
  - The approval is bound to the spec's SHA-256, so an edited comment no longer counts as approved.
  - The build station (STAGE-001-003) commits the approved spec as `specs/<n>-<slug>.md`, the first commit of its PR.
- **D3. Spec format:** Opus 5.5 returns JSON through structured outputs.
  - A validator checks what the schema cannot (ID sequence, file paths, sizes), and the result is rendered to markdown.
  - An invalid spec never reaches a person.
  - Criterion IDs (`AC-n`) are reused by tests, the eval and the panel.
- **D4. Secrets:** `ANTHROPIC_API_KEY` lives in the GitHub environment `factory`, which only `main` may use. Workflows that run pull-request code never get secrets.

## Scope
- `tickets/`: the 3 fixed tickets. Each has a fixed list of context files, which the context graph replaces in STAGE-001-007.
- `packages/stations`: station code in TypeScript, run directly by Node 24, with unit tests in the fast gates.
- `.claude/skills/write-spec/SKILL.md`: the spec station's instructions. A person using Claude Code can run the same skill.
- `.github/workflows/order.yml`: run admission (one run at a time, at most 10 per 24 h), opening the issue, the spec station, the comment and labels.
- `.github/workflows/approval.yml`: approval or rejection by the product owner. It checks who approved and the spec's hash.
- Labels: `run`, `ticket:<id>`, `station:<name>` (one at a time), `spec:approved`, `spec:rejected`, `outcome:<end>`.

## Facts the tickets use
- **Balearic tourist-stay tax (ITS):**
  - Source: the Govern de les Illes Balears ITS calculator (https://illessostenibles.travel/es/calculadora-its), checked 2026-10-19.
  - Hotel Mirador is taken to be a 4-star hotel (category B): €3 per adult per night from 1 May to 31 October, and €0.75 from 1 November to 30 April.
  - Under-16s are exempt. From the ninth night of a stay, the tax is halved. 10% VAT is added on top.
- **EUR to USD:** the ECB reference rate on 2026-10-19 was 1 EUR = 1.1225 USD (eurofxref-daily.xml).

## Done when
Ordering a ticket from GitHub produces a valid spec comment. Approving it moves the issue to `station:build`; rejecting it closes the issue. A second order while a run is open is refused.
