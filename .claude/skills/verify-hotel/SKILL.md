---
name: verify-hotel
description: Launch Hotel Mirador, drive it, and capture evidence that a change meets its spec's criteria (fail-first per criterion, a screenshot per e2e criterion). Used by the build agent before it opens a PR, by the tester, and by people checking a change by hand.
---

# Verify a change to Hotel Mirador

Evidence is an artifact: a test that went red on the base code and green with the change, a screenshot of the page in the state a criterion names, a value read off the running app. "It compiles" and "the diff looks right" are not evidence. Every step below ends on something you can show.

## 1. Launch

From the repo root, a production build on port 3100, the same one the e2e tests use:

```bash
pnpm --filter hotel build && pnpm --filter hotel start -p 3100 &
```

**Healthy** when `curl -sf http://localhost:3100 -o /dev/null` succeeds and the page shows four rooms (see the feature map). Allow up to two minutes for the build. Stop it before running the evidence command, which starts its own.

## 2. Drive

Drive the app with Playwright, the way a visitor would: by role and visible text first, by the test ids in the feature map when a role is ambiguous. Each e2e criterion of the spec is one Playwright test in `apps/hotel/e2e/`, titled with its id: `test("AC-3: ...")`. Each unit criterion is one Vitest test in `apps/hotel/lib/`, titled the same way. The test is how you drive; its assertions are the criterion's Then, with the spec's exact values and text.

## 3. Capture evidence

```bash
node packages/stations/src/run-evidence.ts --spec <the approved spec's envelope.json> --out evidence
```

It runs every criterion's test twice: on the base code (`origin/main`) with your tests, then with your change. It takes a screenshot of every e2e criterion with the change, on a desktop and a 375px phone. **Done** when it exits 0:

- every criterion of the spec has a test, of the kind the spec names;
- every one of those tests fails on the base code and passes with the change;
- `evidence/` holds `evidence.md`, the table and the screenshots that go on the PR.

A test that passes on the base code proves nothing about your change: rewrite it until it fails there for the reason the criterion names. A test file that cannot load on the base code (it imports what your change adds) counts as red for every criterion in it.

## 4. Clean up

Stop any server you started (`kill %1`, or the PID on port 3100), and leave `evidence/` out of the commit: the build workflow publishes it.

## Feature map

- **The page** (`app/page.tsx`): one home page, in order:
  - the hero: `<h1>` with the hotel's name, and the main `nav`;
  - `#house`, the letter ("The house");
  - `#rooms`, the room list (`components/RoomList.tsx`), headed "Four windows";
  - `#built`, how the page is built;
  - the footer, with `#credits`.
- **Rooms:** each row is `data-testid="room"`, with an `<h3>` holding the room's name, `room-price` ("€210") and `room-guests` ("Up to 2 guests"). Data: `data/rooms.json`, four rooms in this order: La Seu (2 guests, €210), Bellver (3, €185), Badia (4, €260), Tramuntana (1).
- **The stage** (`components/Stage.tsx`): the window that shows the view of the room in focus.
- **Credits:** each picture is `data-testid="credit"`, with two links (the work and its licence), from `data/picture-credits.json`.
- **Logic** (`lib/`, each module with its test beside it): `rooms.ts` (`getRooms`, `guestsLabel`), `format.ts` (`formatPrice`, the only way to show a price), `credits.ts`, `views.ts`.
- **Rules** that bind any change: `AGENTS.md` (dates, prices, design tokens, 375px, English).
