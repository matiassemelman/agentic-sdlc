# Runbook

Lookups that cost more than one call to find. Run the commands from the repository root.

## Watch a run

`scripts/watch-run.sh <board.yml|build.yml|seed.yml> [after-run-id]` waits for the workflow's next run (newer than the given id, or than the newest one now) and prints its card key or run number, its result and the factory's log lines. For a build (up to 45 minutes), run it in the background.

`scripts/watch-pr.sh <n>` waits for a PR's checks and prints each job's result, runner, time waiting for a runner and time running. A job with no runner for more than 2 minutes gets a line: the cause is the runners or GitHub, not the change. GitHub's run list can show a job as queued after it started; the job's first step is when it really started.

## Start a run and retry a build

- **A card to Ready, as a person:** the Atlassian MCP acts as Matias, so its moves wake the factory the way a person's do (the relay drops the Factory account's own moves). The transitions keep the names of Jira's old statuses:
  - `To Do` (id 11) leads to Backlog;
  - `In Review` (id 31) leads to Ready;
  - the others are named after their status (`Spec review`, `Build`, `Gates`, `Merge`, `Spec`, `Done`). Triage and Acceptance were removed on 2026-10-21.
- **Start an epic:** move one of its cards to Ready, as a person. Board moves the epic's other cards still in Backlog to Ready behind it, in key order, each with a "Queued behind" comment. To keep one out, move it back to Backlog: a card moved since the drag is left alone. Epics live in `tickets/epics/<id>.md`; Seed files them.
- **Run Seed only when no Board run is waiting.** Seed and Board share a concurrency group, and GitHub keeps only the newest pending run in it: one of them is dropped.
- **Retry an escalated build** (retries come in STAGE-001-009): `gh issue edit <n> --remove-label escalated`, then `gh workflow run build.yml -f run=<n>`. `prepare` builds a run only when it is at the build station, not escalated, approved for its hash and without a PR.

## When the factory needs a person

It assigns the card to the Maintainer (`JIRA_MAINTAINER_ID`, Matias's account `60b2926f07df1c0069b15b8a`): Jira tells him by mail and in its notifications. On GitHub, `gh issue list --label escalated` lists the runs waiting for a person.

## Jira

- Site `https://matiassworkspace-34483436.atlassian.net`, cloud id `5e19d030-059b-4568-8a74-97843fe6853a`, space `KAN`, board id 1.
- **Read the board without the MCP:** `scripts/board.sh` (every open card with its epic, labels and assignee), `scripts/board.sh KAN-6` (one card and its moves), or `scripts/board.sh '<jql>'`. It reads `~/.config/agentic-sdlc/jira-read.env` (mode 600): `JIRA_EMAIL=<Matias's Atlassian email>` and `JIRA_READ_TOKEN=<token>`, a scoped API token with only `read:jira-work` (id.atlassian.com → Security → API tokens → Create API token with scopes → Jira). On 2026-10-21 the MCP's sign-in page did not load.
- Atlassian MCP: labels come back only with `view: "full"` or `responseFields`.
- The Factory account reads Jira in English. Jira translates built-in statuses, and the factory finds statuses by name.

## The relay

- `https://agentic-sdlc-factory.vercel.app/api/jira`, Vercel project `agentic-sdlc-factory`.
- Its requests: `vercel logs requests --scope matiassemelmans-projects -p agentic-sdlc-factory --since 30m --json -q 'requestPath:"/api/jira"'`. Jira's requests come from `Atlassian Webhook HTTP Client`.

## Secrets

- Local copies in `~/.config/agentic-sdlc/` (mode 600): `factory-app.private-key.pem`, `jira-webhook-secret`. They never go in the repository.
- GitHub: the `factory` environment (only `main` can use it) holds `JIRA_API_TOKEN`, `ANTHROPIC_API_KEY` and `FACTORY_APP_PRIVATE_KEY`, plus the variables `FACTORY_APP_ID`, `JIRA_*`. `PRIVATE_TERMS` is a repository variable.
- Vercel: the webhook secret and the dispatch token.

## The factory's GitHub App

- `agentic-sdlc-factory`, id 5404226. In its settings, the private key is under **Credentials → Key pairs**, and the installation under **Install App**.
- Check that the key signs and the App is installed on the repository, with contents, issues and pull requests write:

```bash
KEY=~/.config/agentic-sdlc/factory-app.private-key.pem
b64() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
now=$(date +%s)
h=$(printf '{"alg":"RS256","typ":"JWT"}' | b64)
p=$(printf '{"iat":%d,"exp":%d,"iss":"5404226"}' $((now - 60)) $((now + 540)) | b64)
s=$(printf '%s.%s' "$h" "$p" | openssl dgst -sha256 -sign "$KEY" | b64)
curl -s -H "Authorization: Bearer $h.$p.$s" -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/matiassemelman/agentic-sdlc/installation | jq '{id, permissions, message}'
```

On 2026-10-20 it answered installation 173586678 with `contents`, `issues` and `pull_requests` at `write`.

## Runners

Every job runs on Ubicloud's managed runners (`runs-on: ubicloud-standard-2`; console https://console.ubicloud.com, GitHub Runners), since 2026-10-21: that day GitHub's own runners left every job of the repository queued for about 15 minutes. Ubicloud's app is installed on this repository only; premium runners are off. To go back, set `runs-on: ubuntu-latest` again and drop `.github/actionlint.yaml`.

## Show a guard red

`scripts/guard-red.sh <file> '<exact text of the guard>' '<replacement>' <test file>` takes the guard out, runs the tests and puts it back (CODING_STANDARDS.md, rule 4). It refuses when the text does not occur exactly once: on 2026-10-21 a hand-made `sed` that matched nothing twice looked like a guard that guarded nothing.

## Lint the workflows

`pnpm lint:workflows` runs the same pinned actionlint as the fast gates (1.7.12, which knows `app-id` but not `client-id`).
