# STAGE-001-004: Build with self-verification, and the spec gate

## Decisions (Matias, 2026-10-20)
- **D1. Self-verification with evidence.** Before it opens the PR, the build agent:
  - runs every gate in `AGENTS.md`;
  - shows each new test red on the base code and green with its change (its own fail-first);
  - uses `verify-hotel` to launch the app and take one screenshot per e2e criterion.
  The evidence goes on the PR, with a summary on the card. CI checks it again without trusting it (STAGE-001-005).
- **D2. The spec gate escalates only soft problems.**
  - A clean spec is approved by the gate itself.
  - A spec with a soft problem (more assumptions or out-of-scope items than the limit) waits on the card with the reasons, instead of ending the run.
  - A hard problem (files outside `apps/hotel`, criteria out of order or out of range, empty fields) still ends the run.
  - People's judgement moves upstream, to the design session that writes the tickets.
- **Fixed by `design.md`:** `claude-code-action` with Matias's API key, Sonnet 5.5 as the executor, the agent cannot merge, `main` is protected.

## Facts (checked 2026-10-20)
- `claude-code-action@v1` runs from `workflow_dispatch` with a `prompt` (automation mode) and limits its tools with `claude_args: --allowedTools ...` ([docs](https://github.com/anthropics/claude-code-action/blob/main/docs/solutions.md)).
- **Events made with `GITHUB_TOKEN` start no workflow** ([FAQ](https://github.com/anthropics/claude-code-action/blob/main/docs/faq.md)), so a PR opened with it would get no gates. Two other options:
  - A GitHub App token (`actions/create-github-app-token`) starts them. **This is the one to use.**
  - A personal token would make Matias the PR's author, and an author cannot approve their own PR.

## Scope
- **The spec gate** (`packages/stations`):
  - `validateSpec` separates hard problems from soft ones.
  - `take` handles each spec by its result: a clean one is approved by the gate (the marker says `by=gate:spec`) and the card moves to Build; a soft one escalates (the card stays in Spec review with the reasons); a hard one fails.
  - A person's approval of an escalated spec works as it does now, bound to the hash.
- **`build.yml`**, dispatched by `Board` after any approval. It is idempotent: a run that is already building or already has a PR is left alone.
  1. Checkout on a branch `run/<n>-<slug>`.
  2. `claude-code-action` with the approved spec and the `implement-ticket` skill. Its tools are limited to editing and to the `pnpm` and Playwright commands.
  3. A deterministic step, not the agent, commits, pushes and opens the PR with the factory's App token, so the gates run. It refuses changes outside `apps/hotel`.
  4. It posts the evidence on the PR and a summary on the card. The run moves to `station:gates` and the card to Gates.
  5. A failed build escalates on the card. Retries come in STAGE-001-009.
- **Skills:**
  - `implement-ticket`, the build agent's instructions: one test per criterion named with its `AC-n`, every gate, fail-first, and an `evidence.json`.
  - `verify-hotel`: launch, check, drive, capture evidence and clean up, plus a feature map of the hotel. The build agent, the tester and people all use it.
- **Evidence:** screenshots go on an `evidence` branch and are shown inline in the PR comment through their raw URLs. The card gets the summary and the link.
- **Protection:** `CODEOWNERS`, and a ruleset on `main`:
  - PR required, one approval from a code owner, required checks;
  - the repository admin may bypass it for his own PRs.
- **The board:** Spec review now holds only escalated specs. The Acceptance column is revisited at the end of the stage.

## Matias does (in GitHub)
1. Create a GitHub App, "agentic-sdlc factory", on your account:
   - permissions Contents (read and write), Pull requests (read and write), Issues (read and write);
   - no webhook;
   - installed only on `agentic-sdlc`.
2. In the `factory` environment, save its App ID as the variable `FACTORY_APP_ID` and its private key as the secret `FACTORY_APP_PRIVATE_KEY`.

## Done when
- A prepared ticket with a clear spec goes from Ready to an open PR with no person:
  - the spec gate approves the spec;
  - the build runs;
  - the PR shows the evidence (each test red and then green, a screenshot per e2e criterion);
  - the gates run on it.
- A spec with too many assumptions waits on the card with the reasons. Moving it to Build approves it, and the build starts.
- The PR belongs to the factory's App, and only the Maintainer can merge it.
- A change outside `apps/hotel` never reaches the PR.
