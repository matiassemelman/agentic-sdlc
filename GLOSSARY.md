# agentic-sdlc

A small-scale software factory, after Uber and Spotify: a visitor orders a change to a demo hotel app and watches it travel from ticket to production, approving it at the human checkpoints.

## Language

### The line

**Software factory**:
The whole delivery line from ticket to production, where agents do the work and gates and people decide what moves forward.
_Avoid_: pipeline (that is only CI), software house or outsourcing (the consultancy sense)

**Ticket**:
One of the predefined change requests a visitor can order; the unit of work that enters the factory.
_Avoid_: task, story, feature request

**Run**:
One ticket's trip through the factory, from the order to production or to rejection.
_Avoid_: job, execution, pipeline run

**Station**:
One step of a run where a single agent, gate or person acts on the change.
_Avoid_: stage, phase, step

**Spec**:
The written definition of a ticket, with acceptance criteria, approved by a person before any code is written.
_Avoid_: plan, design doc, requirements

**Ephemeral environment**:
A temporary, isolated copy of the app built for a single change and discarded when that change closes.
_Avoid_: preview, staging, test server

### Checks

**Gate**:
An automatic check a change must pass before it moves to the next station.
_Avoid_: check, control, step

**Eval**:
A gate where a model judges whether a change meets each acceptance criterion of its spec.
_Avoid_: LLM test, AI check

**Benchmark**:
A fixed set of cases with known answers, used to measure the factory's own agents and to choose their models.
_Avoid_: eval suite, evals, test set

### People

**Approval**:
A decision a person makes at a fixed station of a run: approving the spec, accepting the change, or merging it.
_Avoid_: human gate, sign-off, human in the loop

**Product owner**:
The visitor who orders the ticket, approves the spec and accepts the change in its ephemeral environment.
_Avoid_: user, client, requester, reviewer

**Maintainer**:
The repository owner, the only person who can merge a change into production.
_Avoid_: admin, reviewer, approver
