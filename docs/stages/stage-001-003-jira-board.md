# STAGE-001-003: The Jira board, with prepared tickets

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
- **D7. Identity:** the factory acts on the board as its own Atlassian account, "Factory", with a scoped API token (`read:jira-work`, `write:jira-work`) in the `factory` environment.
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

## Done when
- A guest moves a prepared card to Ready and, without opening GitHub, sees the spec on the card within a minute.
- Moving the card to Build approves the spec: the run issue shows the approval bound to the hash. Moving it to Done rejects it.
- A second card waits in Ready and is taken when the first run ends.
- A repeated or forged webhook changes nothing.
