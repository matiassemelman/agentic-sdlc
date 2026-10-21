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
Where the App's key and installation live, and how to check them: `docs/runbook.md`.

1. Create a GitHub App, "agentic-sdlc factory", on your account:
   - permissions Contents (read and write), Pull requests (read and write), Issues (read and write);
   - no webhook;
   - installed only on `agentic-sdlc`.
2. In the `factory` environment, save its App ID as the variable `FACTORY_APP_ID` and its private key as the secret `FACTORY_APP_PRIVATE_KEY`.

## Built (2026-10-20, not yet run live)
- **Spec gate:** `validateSpec` returns `{ hard, soft }`. `take` approves a clean spec (`by=gate:spec`, card to Build) and escalates a soft one with its reasons in plain words. Every approval, by the gate or by a person, starts `build.yml`.
- **Evidence:** `run-evidence.ts` takes the change's tests to a worktree of the base code: the unit tests first, then the e2e tests, because `next build` type-checks every file. Each criterion's test must be red there and green with the change. Every e2e criterion gets a screenshot on a desktop and a 375px phone. It took 37 s on a test change.
  - Checked against planted defects: it caught a hollow unit test, a hollow e2e test, a test that fails with the change and a criterion with no test. It passed the one sound test.
  - A test file that cannot load on the base code counts as red for every criterion in it, so a hollow test hidden in such a file gets through. That is the eval's job (STAGE-001-008).
- **Skills:** `verify-hotel` (launch, drive, evidence, clean up, feature map) and `implement-ticket` (tests first, every gate, evidence, or `.factory/blocked.md`).
- **`build.yml` and `build.ts`:**
  - `prepare` builds a run once: approved for its hash, at the build station, not escalated, with no PR.
  - The agent runs with the Anthropic key and a read-only token, and only the gates' and the evidence's commands.
  - The factory's own evidence run, the App token and `publish` run even when the agent failed:
    - a change outside `apps/hotel`, a `blocked.md`, no change, or an agent that did not finish goes to a person;
    - red evidence opens a draft PR and goes to a person too.
- **Protection (2026-10-21):** `.github/CODEOWNERS` (`* @matiassemelman`) and the ruleset "main: reviewed and gated" (id 25544547):
  - a PR, with one approval from a code owner; stale approvals are dismissed on push;
  - the fast gates, from GitHub Actions only;
  - no force-push or deletion;
  - the admin may bypass it only through a PR (`gh pr merge --admin`), for his own PRs.
- **Not yet:** the Acceptance column.

## Live runs (2026-10-20 and 21, KAN-3, run #19)
- **Board:** KAN-3 to Ready (moved through the Atlassian MCP, as Matias) → run #19 opened → spec posted ($0.067) → approved by the spec gate → build started. The webhook, the relay and the columns worked; the App's install was checked with a JWT (`docs/runbook.md`).
- **Build 1** stopped at the agent: `claude-code-action` refuses a workflow started by `github-actions[bot]`, and Board starts `build.yml` with `GITHUB_TOKEN`. Fixed with `allowed_bots: github-actions[bot]` (PR #20). The run escalated to a person, as designed.
- **Build 2** (18 min) was green: every criterion red on `main` and green with the change, a screenshot per e2e criterion on desktop and a 375px phone. `publish` refused it: `git()` trims its output, so ` M apps/hotel/app/globals.css` lost its leading space and became `pps/hotel/...`, outside the hotel. Fixed with `changedFiles`, tested on git's real output (PR #21).
- **Build 3** (16 min) was green again, and its push was refused: "refusing to allow a GitHub App to create or update workflow `.github/workflows/board.yml` without `workflows` permission". PR #23 changed `board.yml` on `main` while the build ran from the older `main`, and GitHub treats an App's branch whose workflows differ from `main`'s as a workflow change. The failure also stayed in Build with no one told. Fixed (PR #24): `publish` rebases the change onto `main` as it is now, and a failed push escalates with git's own words, never the push URL with the App's token.

- **Build 4** opened PR #26 by `agentic-sdlc-factory[bot]`. Its gates passed, `Board` moved KAN-3 to Merge and assigned it to the Maintainer, who approved and merged it; the run closed as completed and production shows the switch.

## Build time (2026-10-21)
Measured, not assumed: the fast gates take 39 s, so the time is in the build.

| Step | Sonnet 5.5, KAN-3 (builds 2, 3) | Haiku 5.5 high, KAN-4 (run #27) |
|---|---|---|
| The build job | ~1130 s | 585 s |
| The build agent | 801 / 819 s | 447 s (43 turns, $0.12; model 229 s, tools 218 s) |
| The factory's evidence | 232 / 237 s | 44 s |

- The evidence's base spent 212 of 237 s on five tests meant to fail, in one worker, each retried and waiting out a click on a missing button. Now: `--retries=0 --fully-parallel --workers=5` on the base, and `actionTimeout` 5 s in the hotel's Playwright config (PR #25).
- The two runs differ in ticket and model, and the agent ran the faster evidence too (6 times), so the agent's drop is not Haiku's alone.
- Run #27 escalated: `AGENTS.md` tells the agent to run `pnpm --filter hotel e2e`, and its allowed tools refused it. Haiku stopped and asked instead of working around it. Fixed, with a test that every gate in `AGENTS.md` is an allowed tool (PR #27).
- The same PR protects `apps/hotel/AGENTS.md` and the hotel's test configs: the agent may not change its own rules or the harness that judges it, and `AGENTS.md` and `implement-ticket` say so.

## The board finishes by itself (2026-10-21)
After the build, nothing moved the card past Gates. Now `Board` also runs when the fast gates finish (`workflow_run`) and when `main` changes (a merge), and it reads each run's PR:
- every gate passed (`GATES` in `board.ts`): the run goes to `station:maintainer`, the card to Merge, assigned to the Maintainer;
- a gate failed: the run is escalated, the card stays in Gates, assigned to the Maintainer;
- the PR merged: the run is closed as completed (`outcome:merged`) and the card goes to Done;
- the PR closed without a merge: the run fails and the card goes to Done.
Each step leaves a marker on the run issue, so a look that gets GitHub's list from before it does nothing twice (each test is red without its marker).

**How a person hears about it:** every escalation (spec gate, build, gates, a failed run) and every PR waiting for the merge assigns the card to the Maintainer (`JIRA_MAINTAINER_ID`, a variable of the `factory` environment). Jira tells them by mail and in its notifications, and the board shows their avatar on the card. Before this, an escalation was only a comment no one was told about.

## Done when
- A prepared ticket with a clear spec goes from Ready to an open PR with no person:
  - the spec gate approves the spec;
  - the build runs;
  - the PR shows the evidence (each test red and then green, a screenshot per e2e criterion);
  - the gates run on it.
- A spec with too many assumptions waits on the card with the reasons. Moving it to Build approves it, and the build starts.
- The PR belongs to the factory's App, and only the Maintainer can merge it.
- A change outside `apps/hotel` never reaches the PR.
