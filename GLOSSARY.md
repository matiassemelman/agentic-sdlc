# agentic-sdlc

A small-scale software factory, after Uber and Spotify: a design session turns an idea for a demo hotel app into tickets, the factory carries each ticket to a verified pull request on its own, and people decide only when it escalates or when the change goes to production.

## Language

### The line

**Software factory**:
The whole delivery line from ticket to production, where agents do the work and gates and people decide what moves forward.
_Avoid_: pipeline (that is only CI), software house or outsourcing (the consultancy sense)

**Design session**:
A conversation in which the Maintainer and an agent grill an idea until it splits into clear tickets, filed on the board as an epic.
_Avoid_: refinement, planning, grooming

**Ticket**:
A change request on the board, filed by a design session, prepared in the repository, or written by a product owner; the unit of work the factory takes from Ready.
_Avoid_: task, story, feature request, issue, work item

**Prepared ticket**:
A ticket whose text is kept in the repository with its facts checked; the factory reads that text, never the copy on the board.
_Avoid_: template, fixed ticket, demo ticket

**Epic**:
The tickets one design session files together, in the order they are to be built; each one can reach production without the others.
_Avoid_: feature, project, batch, sprint

**Board**:
The Jira kanban where people see the factory's work and decide; each column is a station or a queue.
_Avoid_: dashboard, panel, tracker

**Ready**:
The queue the factory takes its next ticket from, oldest first, one at a time. Moving one ticket of an epic there queues the rest of its epic behind it.
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
The written definition of a ticket, with acceptance criteria, approved before any code is written: by the spec gate, or by a person when the gate escalates it.
_Avoid_: plan, design doc, requirements

**Ephemeral environment**:
A temporary, isolated copy of the app built for a single change and discarded when that change closes.
_Avoid_: preview, staging, test server

### Checks

**Gate**:
An automatic check a change must pass before it moves to the next station.
_Avoid_: check, control, step

**Spec gate**:
The gate that decides whether a spec is clear enough to build without a person, and escalates it when it is not.
_Avoid_: auto-approval, spec review

**Eval**:
A gate where a model judges whether a change meets each acceptance criterion of its spec.
_Avoid_: LLM test, AI check

**Benchmark**:
A fixed set of cases with known answers, used to measure the factory's own agents and to choose their models.
_Avoid_: eval suite, evals, test set

### People

**Escalation**:
The factory stopping a run to ask a person, on its card, because its own evidence is not enough to go on.
_Avoid_: alert, handoff, manual review

**Approval**:
A decision a person makes on a run: answering an escalation, triaging a ticket a guest wrote, or merging the change into production.
_Avoid_: human gate, sign-off, human in the loop

**Product owner**:
The person who decides what a ticket means: writes or prioritises tickets and answers the factory's escalations about them. A role: in a demo, a guest plays it.
_Avoid_: user, client, requester, reviewer, visitor

**Maintainer**:
The repository owner, the only person who can merge a change into production.
_Avoid_: admin, reviewer, approver
