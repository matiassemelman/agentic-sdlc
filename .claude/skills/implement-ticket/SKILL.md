---
name: implement-ticket
description: Implement one approved Hotel Mirador spec, test-first, and prove each acceptance criterion with evidence before anything is committed. The factory's build station runs it; a person can run it the same way.
---

# Implement an approved spec

You implement one approved spec for Hotel Mirador. The spec is in `.factory/envelope.json` (`spec.criteria`, `spec.emptyStates`, `spec.assumptions`, `spec.files`). The product owner approved exactly that text: build what it says, with its values and its words, and nothing else.

You are **done** when every gate in `AGENTS.md` passes and the evidence command (step 5) exits 0. A change that only compiles, or that you believe works, is not done. The workflow that runs you commits, pushes and opens the PR; you leave the work in the working tree.

## Steps

1. **Read before you write.** The spec, `AGENTS.md`, `apps/hotel/AGENTS.md` (Next.js 16 has breaking changes: read the guide it points to before writing Next code), and the feature map in `.claude/skills/verify-hotel/SKILL.md`. Read every file the spec lists under files likely to change.
2. **One test per criterion, first, titled with its id.** `it("AC-1: ...")` in `apps/hotel/lib/<module>.test.ts` for a unit criterion; `test("AC-3: ...")` in `apps/hotel/e2e/<slug>.spec.ts` for an e2e one. Assert the spec's Then with its exact values and text, and the empty states' exact words. Run them: each must fail now, for the reason its criterion names.
3. **The smallest change that makes them pass,** under `apps/hotel/` only. Logic in `lib/` as pure functions; components thin; prices only through `lib/format.ts`; the design tokens in `app/globals.css`; text in English. Everything outside `apps/hotel/` is the factory's, and so are the hotel's agent rules and test configs (`apps/hotel/AGENTS.md`, `apps/hotel/playwright.config.ts`, `apps/hotel/vitest.config.ts`): a change there never reaches the PR.
4. **Every gate**, from the repo root, until all pass: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and the design house rules (`node .claude/skills/design-taste-frontend/scripts/lint.mjs apps/hotel/app apps/hotel/components`).
5. **Evidence**, with `verify-hotel`'s command and the spec:
   ```bash
   node packages/stations/src/run-evidence.ts --spec .factory/envelope.json --out evidence
   ```
   It exits 0 when every criterion has a test of its kind, each test fails on the base code and passes with your change, and each e2e criterion has its screenshots. When it names a problem, fix the test or the code and run it again. A test that passes on the base code would pass even if your change were wrong: make it fail there for the criterion's reason.

## When you cannot finish

If the spec contradicts itself, contradicts `AGENTS.md`, or needs a change outside `apps/hotel/`, stop and write `.factory/blocked.md`: what you tried, what blocks you, and the question a person must answer. The workflow puts it on the card for a person. Writing it is part of the work, not a failure to hide.
