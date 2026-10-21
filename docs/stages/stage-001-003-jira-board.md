# STAGE-001-003: The Jira board, with prepared tickets

**Done 2026-10-20.** Closed after the live test and its fixes (PRs #9, #10, #12, #14 and the closing docs). The design changed at the close: people on the loop ([ADR 0001](../adr/0001-people-on-the-loop.md)), so the product owner's moves below become escalations in STAGE-001-004.

## Decisions (Matias, 2026-10-20)
- **D1. Roles:** the board (Jira) is where people see the work and decide. GitHub is where the factory works and keeps its record.
  - Each side writes only its own data. The board sends decisions; the factory sends station moves, comments and links.
- **D2. Columns are statuses**, one status per column with the same name:
  `Backlog → Triage → Ready → Spec → Spec review → Build → Gates → Acceptance → Merge → Done`.
  - The product owner moves cards out of Backlog, Spec review and Acceptance.
  - The Maintainer moves cards out of Triage and Merge. The factory moves the rest.
- **D3. The factory pulls from Ready**, oldest first, one run at a time. When a run ends, it takes the next card in Ready. A card moved to Ready while the factory is busy waits there, in sight.
- **D4. Prepared tickets:** the card carries the label `ticket:<id>`, and the factory reads the ticket's text from `tickets/`. The description on the board is a copy for people to read; an edit there never reaches an agent.
- **D5. From the board to GitHub:**
  1. A Jira admin webhook, signed with HMAC, calls a small relay in `apps/factory` on Vercel.
  2. The relay checks the signature and dispatches one workflow, `board.yml`, with the card's key.
  3. The relay holds the webhook secret and a fine-grained GitHub token: Actions write, this repository only, with an expiry.
  - No Jira automation: Free gives 150 steps a month, and a token stored in a rule can be redirected by anyone who can edit the rule.
- **D6. The factory reads the board; it never trusts the message.** `board.yml` fetches the card's status and history from Jira and acts on those. A repeated or forged message changes nothing.
- **D7. Identity:** the factory acts on the board as its own Atlassian account, "Factory", with a scoped API token in the `factory` environment. The token needs `read:jira-work`, `write:jira-work`, and `read:jira-user`; without the last scope, `/myself` answers 401 "scope does not match", and the factory cannot tell its own moves from a person's.
- **D8. The spec on the board:**
  - It is posted as a comment on the card, with its SHA-256 and a link to the run issue.
  - Moving the card from Spec review to Build approves it, and moving it to Done rejects it.
  - The approval checks the hash against the spec the factory posted on GitHub.
- **D9. Links on the card:** the run issue, the PR, the ephemeral environment and the production deploy, posted by the factory. The GitHub for Jira app is used only if it works with a personal account; it needs an organization owner.
- **D10. Guests are Jira users.** Free has no public access, and every user administers every space. `Reset demo` (STAGE-001-011) restores the board.
- **D11. Stage 2 closes here:** retries on GitHub 5xx errors, and failure messages that say what failed (a refused API key, GitHub down) on the card and on the run issue.

## Facts (Jira Free, checked 2026-10-20)
- **Seats and access:**
  - 10 users at most. Every user administers every space.
  - No guests and no public access; a guest needs an Atlassian account. ([plans](https://support.atlassian.com/jira-cloud-administration/docs/explore-jira-cloud-plans/), [permission limits](https://support.atlassian.com/jira-cloud-administration/docs/permissions-limitations-in-free-jira-sites/))
- **Automation:** 150 steps per month. A trigger that matches nothing still costs one. ([usage](https://support.atlassian.com/cloud-automation/docs/how-is-my-usage-calculated/))
- **Admin webhooks:**
  - They can be filtered by JQL and signed with a secret (`X-Hub-Signature`).
  - A failed delivery is retried up to 5 times, so the same message can arrive more than once.
  - They cannot add an auth header, so they cannot call GitHub directly. ([webhooks](https://developer.atlassian.com/cloud/jira/platform/webhooks/))
- **Scoped API tokens:** they call `https://api.atlassian.com/ex/jira/{cloudId}` with basic auth (email:token) and expire after 1 to 365 days. ([tokens](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/))
- **`workflow_dispatch`:**
  - Needs Actions write on a fine-grained token.
  - Returns the run id with `return_run_details: true`. ([dispatch](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event))

## Scope
- **`apps/factory`:** a Next.js app on Vercel with one route, `POST /api/jira`, which verifies the signature and dispatches `board.yml`. The panel (EPIC-002) grows here later. Agents never change it.
- **`packages/stations`:**
  - a Jira client (REST v3);
  - the board router, which turns a card's status and history into an action;
  - the spec as a Jira comment (ADF built from the spec JSON);
  - taking the next card from Ready.
- **`.github/workflows/board.yml`:** the factory's single entry, with its admission, spec station and approval paths.
  - It replaces `order.yml` and `approval.yml`.
  - GitHub labels stay as the run's record, written only by the factory.
- **Seed:** a workflow that puts the 3 prepared tickets in Backlog, and a card for run #8 in Spec review.
- **Docs:** `design.md` (stations and architecture), `AGENTS.md` (layout), `GLOSSARY.md`.

## Matias does (in the Jira, GitHub and Vercel interfaces)
1. The columns. Done.
2. The Factory account, invited as a Jira user, and its scoped token as `JIRA_API_TOKEN` in the `factory` environment. Done 2026-10-20.
3. A Vercel project for `apps/factory` (root directory `apps/factory`) with the variables `JIRA_WEBHOOK_SECRET`, `GITHUB_DISPATCH_TOKEN`, `GITHUB_REPOSITORY`, `JIRA_PROJECT` and `FACTORY_ACCOUNT_ID`.
4. A fine-grained GitHub token for the relay: this repository only, Actions read and write, with an expiry.
5. The Jira webhook (System → Webhooks): the relay's `/api/jira` URL, the same secret, issue updated events, JQL `project = <key>`.

## Built (2026-10-20)
- `apps/factory`: `POST /api/jira` checks the HMAC signature and wakes `board.yml`. It answers 401 to a bad signature, 200 to anything it ignores, and 502 when the dispatch fails, so Jira retries.
- `packages/stations`:
  - `board.ts` decides from what the board and GitHub show;
  - `factory.ts` acts and looks again until nothing is left;
  - `jira.ts`, `github.ts` and `http.ts` hold the clients, with retries on 429 and 5xx;
  - `seed.ts` puts the prepared tickets in Backlog and adopts a run from before the board.
  - Unit tests run against an in-memory board and GitHub.
- `board.yml` (the single entry) and `seed.yml` replace `order.yml` and `approval.yml`. Variables in the `factory` environment: `JIRA_CLOUD_ID`, `JIRA_SITE`, `JIRA_EMAIL`, `JIRA_PROJECT`.

## Refinement (2026-10-20)
- **The Factory account's language must be English.** Jira translates its built-in statuses (To Do, In Progress, Done) into the reader's language. It also translates a status reused from the site, as with Ready, which came back as "Listo". With a Spanish account, the API answered "Finalizada" and "Listo", and the seed found no Done or Ready.
- **A status added to the Task workflow can reuse a site-wide status of the same name.** That is how Ready came with its translation.
- **The editor's Replace only offers statuses outside the workflow.** Merging into one already there means deleting the old status instead.
- **The column settings dialog failed to save several times.** The workflow editor (Space settings → Work types → Task → Edit workflow) worked.
- **The token's scopes:** `/myself` needs `read:jira-user`. `node packages/stations/src/jira-scopes.ts` lists the scopes every call in `jira.ts` needs, read from the official spec; run it before asking for a token.
- **Retro guardrails (2026-10-20):**
  - `Seed board` checks the Task workflow and names the account's language when it explains missing statuses.
  - Fast gates lint the workflows (`actionlint` 1.7.12 with shellcheck), since they only run from `main`.
  - Fast gates fail on private terms in tracked files or new commit messages. The terms live in the `PRIVATE_TERMS` repository variable, never in the repo, and the log names only file:line.
  - `scripts/show-spec.sh <n>` prints a run's spec without its data block.
- **Seeded on 2026-10-20:** KAN-1 to KAN-3 in Backlog, and KAN-4 (run #8) in Spec review.

## Live test (2026-10-20)
- **The webhook's URL pointed at Jira's own webhooks page,** so no real event reached the relay. The check after the merge, a signed POST we built ourselves, came back green without touching Jira's side. A check counts only when the event comes from the real source.
- **The lost event changed nothing.** Matias's first drag of KAN-4 to Build never reached the factory. The first event after the fix (KAN-1 to Triage) woke `Board`, which read the board and applied the pending approval.
- **Verified on the board, run by run:**
  - Approval: #8 to `station:build` with `factory:approved` bound to the spec's sha256, and the comment on the card.
  - A second look with nothing changed: no action.
  - Take: KAN-1 from Ready to Spec review with its spec in 46 s (#11, $0.074).
  - Queue: KAN-2 waits in Ready with a note while #11 waits for its approval.
  - Wrong drags: KAN-2 (no run) from Ready to Acceptance goes back to Backlog; KAN-1 from Spec review to Acceptance goes back to Spec review. Each with a comment that says why.
  - Rejection: #11 closed as not planned with `outcome:rejected`.
- **Bug: the rejection's pass did not take the card waiting in Ready.** GitHub's issue list still showed #11 open right after the factory closed it, so the factory counted itself busy, and nothing woke it again. The unit test passed because the fakes are always consistent. Jira's JQL search has the same lag, and Atlassian documents it ([search and reconcile](https://developer.atlassian.com/cloud/jira/platform/search-and-reconcile/)).
  - Fix: `reconcile` lays the runs it wrote over GitHub's list (`own-writes.ts`), and `observe` reads every card again on its own, since a single card read is consistent.
  - The fakes can now freeze their listings. Two tests reproduce the lag, and each fails without its half of the fix.
- **Ready and Done had no column on the board. Fixed on 2026-10-20.** The statuses were in the workflow (ids 10011 and 10003), but hidden. That put the board in "Advanced" mode, where columns cannot be added from the board, and Space settings has no Board page in the new interface.
  - The Configure columns dialog failed to save because a new column also creates a new status with the column's name, and "Done" and "Ready" clash with the statuses already there. The interface says only "Unable to save your settings".
  - What worked: create the column, drag the existing status into it, remove the status the column created, and publish. With every status in its column, the board leaves Advanced mode.
  - Checked through the API: 10 columns, Ready on 10011 and Done on 10003, and still 10 statuses.
- **The spec station failed on KAN-2** (run #13, after PR #12): "Failed to parse structured output: Unterminated string in JSON at position 3859".
  - The SDK's `messages.parse` parses each text block on its own and throws before the station reads the stop reason. A cut-off answer, a refusal or a JSON split across blocks all became "failed in an unexpected way", and the answer, with its tokens, was lost.
  - Fix: `messages.create` (the same request, as the SDK's source shows) and `answerOf`. It joins the text blocks and leaves a cut-off or a refusal to the station. Any other broken answer says its stop reason, its length, its blocks and its tokens. The output limit goes from 4096 to 8192, since a longer ticket can need more.
  - The failure path itself held: #13 closed with `outcome:failed` and KAN-2 went to Done, with the reason on both.
- **A Spanish-speaking product owner reads "Listo" and "Finalizada"** where the card says Ready and Done. Column names are free text and are not translated, so the columns fix this on the board.

- **The spec station refused KAN-2's spec** (run #15): more than 8 assumptions. The limit was enforced but never told to the model, whose only view of the rules is the schema's descriptions. They now state every list limit, taken from `LIMITS`, with a test. Under ADR 0001 such a spec escalates to a person instead of ending the run (STAGE-001-004).
- **Not checked live, left for STAGE-001-004:** the refusal of an approval when the spec on the card was edited, and a rejection's pass taking the next card. Unit tests cover both, with lagging listings. The approval flow changes with the spec gate, so they are checked live there.

## Review (2026-10-20)
`/code-review high` of PRs #9 and #10 and the listing-lag fix. Each finding was checked against the code before it was fixed, and each fix has a test that fails without it:
- **Lag across Board runs, not only inside one.** A run that starts while GitHub's list still shows the previous one's state:
  - A card the factory itself put at a station is never treated as dragged there by hand. It stays, and the factory counts itself busy with it.
  - An approval already on the run issue for the same sha256 is not posted again.
- **The card that woke the factory is read on its own,** since the search may not show it yet. The hint counts only if it is a key of the factory's space.
- **Whatever stops a run after it is opened** (Jira or GitHub, not only the model) ends it with what failed, instead of "cancelled or timed out" on the next pass.
- **`check-private-terms.sh` could miss a hit.** With `pipefail`, xargs answers 123 when any batch has no match, so the hits were dropped. It also lacked `-H` for a batch of one file. Reproduced before the fix.
- **A spec without a card** told the reader to use the old `spec:approved` labels.
- **Smaller:** one chain of Jira calls per card instead of two waves, and the relabel rule in one place (`relabeled` in `github.ts`).

**Known limits, not fixed:**
- Seed shares Board's concurrency group, and GitHub keeps only the newest pending run per group: run Seed while no Board run waits (noted in `seed.yml`).
- The comments of a card or run issue are read up to 100, oldest first. A card with more would hide its newest spec from the approval.
- A rejection seen again by a run that starts during GitHub's lag posts its comment twice. Harmless; the build station's dispatch must be idempotent the way the approval now is.

## Done when
- A guest moves a prepared card to Ready and, without opening GitHub, sees the spec on the card within a minute.
- Moving the card to Build approves the spec: the run issue shows the approval bound to the hash. Moving it to Done rejects it.
- A second card waits in Ready and is taken when the first run ends.
- A repeated or forged webhook changes nothing.
