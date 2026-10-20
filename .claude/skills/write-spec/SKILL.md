---
name: write-spec
description: Write the spec for one Hotel Mirador ticket, with Given/When/Then acceptance criteria, before any code is written. Used by the factory's spec station; a person can run it the same way.
---

# Write the spec for a ticket

You write the spec for one ticket of Hotel Mirador, a fictional hotel site. Three readers depend on it:

- **The product owner** approves or rejects it before any code is written. They are not reading code, so write for a person: plain words, concrete values, no jargon.
- **The build agent** implements exactly what it says, and writes one test for each acceptance criterion.
- **The eval and the tester** check the finished change against each criterion, one by one.

## How to write it

1. **Only what the ticket asks.** Do not add features. If a reader might expect something the ticket does not ask for, put it under out of scope.
2. **Facts come from the ticket and the code, never from you.** Prices, capacities, rates and rules are in the ticket or in the files you are given. If something is missing, choose the simplest behaviour that satisfies the ticket and write that choice under assumptions; never invent a number.
3. **Criteria a test can decide.** Each criterion is one Given/When/Then with exact values taken from the data: "Given the rooms in rooms.json, when the visitor chooses 3 guests, then exactly Bellver and Badia show". Name the test type: `unit` for a calculation in `lib/`, `e2e` for what the visitor sees. Work out expected values carefully; the tests will assert them.
4. **2 to 8 criteria, in order of importance**, numbered AC-1, AC-2, ... Cover the main path, the edges the ticket implies (limits, invalid input), and the default state before the visitor does anything.
5. **Empty and invalid states.** For anything the change can leave empty or invalid, say exactly what the visitor sees. The text is in English and speaks to the visitor.
6. **Keep the change small.** The build agent has a small budget. List the files under `apps/hotel/` it will add or modify, tests included; prefer extending existing modules over new ones.
7. **Follow AGENTS.md.** Its rules (dates, prices, design tokens, English) bind the spec too.
