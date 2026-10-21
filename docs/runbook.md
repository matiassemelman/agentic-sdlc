# Runbook

Lookups that cost more than one call to find. Run the commands from the repository root.

## Watch a run

`scripts/watch-run.sh <board.yml|build.yml|seed.yml> [after-run-id]` waits for the workflow's next run (newer than the given id, or than the newest one now) and prints its card key or run number, its result and the factory's log lines. For a build (up to 45 minutes), run it in the background.

## Start a run and retry a build

- **A card to Ready, as a person:** the Atlassian MCP acts as Matias, so its moves wake the factory the way a person's do (the relay drops the Factory account's own moves). The transitions keep the names of Jira's old statuses:
  - `To Do` (id 11) leads to Backlog;
  - `In Progress` (id 21) leads to Triage;
  - `In Review` (id 31) leads to Ready;
  - the others are named after their status (`Spec review`, `Build`, `Gates`, `Acceptance`, `Merge`, `Spec`, `Done`).
- **Retry an escalated build** (retries come in STAGE-001-009): `gh issue edit <n> --remove-label escalated`, then `gh workflow run build.yml -f run=<n>`. `prepare` builds a run only when it is at the build station, not escalated, approved for its hash and without a PR.

## Jira

- Site `https://matiassworkspace-34483436.atlassian.net`, cloud id `5e19d030-059b-4568-8a74-97843fe6853a`, space `KAN`, board id 1.
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

## Lint the workflows

`pnpm lint:workflows` runs the same pinned actionlint as the fast gates (1.7.12, which knows `app-id` but not `client-id`).
