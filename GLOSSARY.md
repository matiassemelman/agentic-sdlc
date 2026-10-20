# agentic-sdlc

A small-scale software factory, after Uber and Spotify: a product owner puts a change to a demo hotel app on the board and watches it travel from ticket to production, deciding at the human checkpoints.

## Language

### The line

**Software factory**:
The whole delivery line from ticket to production, where agents do the work and gates and people decide what moves forward.
_Avoid_: pipeline (that is only CI), software house or outsourcing (the consultancy sense)

**Ticket**:
A change request on the board, either one of the prepared tickets or one a product owner writes; the unit of work the factory takes from Ready.
_Avoid_: task, story, feature request, issue, work item

**Prepared ticket**:
A ticket whose text is kept in the repository with its facts checked; the factory reads that text, never the copy on the board.
_Avoid_: template, fixed ticket, demo ticket

**Board**:
The Jira kanban where people see the factory's work and decide; each column is a station or a queue.
_Avoid_: dashboard, panel, tracker

**Ready**:
The queue the factory takes its next ticket from, oldest first, one at a time.
_Avoid_: to do, selected, sprint

**Triage**:
The Maintainer's reading of a ticket a product owner wrote, before the factory lets any agent read it.
_Avoid_: review, grooming, screening

**Run**:
One ticket's trip through the factory, from Ready to production or to rejection.
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
A decision a person makes at a fixed station of a run: triaging a written ticket, approving the spec, accepting the change, or merging it.
_Avoid_: human gate, sign-off, human in the loop

**Product owner**:
The person who prioritises the board, writes or picks a ticket, moves it to Ready, approves its spec and accepts the change in its ephemeral environment. A role: in a demo, a guest plays it.
_Avoid_: user, client, requester, reviewer, visitor

**Maintainer**:
The repository owner, the only person who can merge a change into production.
_Avoid_: admin, reviewer, approver
