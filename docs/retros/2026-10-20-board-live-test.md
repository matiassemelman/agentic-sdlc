# Retro: the board's live test and STAGE-001-004 (2026-10-20)

Improvements to the environment, most severe first. Apply them at the start of the next session, before the first live build. Each has a check that says it is done.

## 1. A factory doctor: check the setup from the real sources before a live run

**What happened:** four setup faults surfaced only when a person moved a card, one at a time, each costing a round of screenshots:
- the Jira webhook's URL pointed at Jira's own page;
- Ready and Done had no column on the board;
- the GitHub App had no private key;
- the App was not installed on the repository.

The "relay verified" check after PR #10 passed, because it posted a body we built ourselves and never touched Jira's side.

**Do:** add `packages/stations/src/run-doctor.ts`, run by a manual `doctor.yml` in the `factory` environment, which has the secrets. It names each fault in plain words and exits 1 on any. It checks:
- the `factory` environment has every variable and secret the workflows read;
- the App's key signs a JWT, the App is installed on this repository, and it has contents, issues and pull requests write (as in `GET /repos/{repo}/installation`; the session's snippet is in `docs/runbook.md`);
- the Factory account's locale is English;
- every status in `STATUS` has its own board column (`GET /rest/agile/1.0/board/{id}/configuration`; check the token's scopes with `jira-scopes.ts` first);
- the relay received a request from `Atlassian Webhook HTTP Client` after the doctor's start, which needs a real move; see item 2.

**Done when:** `doctor.yml` passes on today's setup, and fails with a clear line when one variable is renamed.

## 2. Read access to Jira's admin settings for the agent

**What happened:** the agent could not see the webhook's settings or the board's columns. The Firefox MCP has no Atlassian session, and the Factory account is not an admin. Every check went through a screenshot from Matias.

**Do (Matias):** a classic API token of his own with read-only use, kept in `~/.config/agentic-sdlc/jira-admin-token` (mode 600) and never in the repo or in CI. With it, a local `scripts/jira-admin-check.sh` reads `GET /rest/webhooks/1.0/webhook` and confirms the URL is the relay's `/api/jira`, the JQL is `project = KAN` and the event is `jira:issue_updated`.

**Done when:** the script prints the webhook's URL, JQL and events, and fails if the URL is not the relay's.

## 3. One command to watch a factory run

**What happened:** the agent rewrote the same watch loop about ten times, a `gh run list` poll followed by a log grep. Once it said a watcher was running when it had not started one.

**Do:** `scripts/watch-run.sh <workflow> [after-run-id]` waits for that workflow's next run and prints the card key it was woken for, its result, and the factory's log lines (`KAN-1: run #11 opened`, `spec posted`, …), without the env dump. It works for `board.yml` and `build.yml`.

**Done when:** watching a `Board` run takes one call and prints at most about 10 lines.

## 4. A `CODING_STANDARDS.md` for the reviewer

**What happened:** three bugs passed every test because the tests trusted something the real world does not do. The reviewer had no rule to catch them: `/code-review` reported "no CLAUDE.md conventions".
- The fakes were more consistent than GitHub and Jira, whose listings lag behind writes.
- A validator limit was never stated where the model reads its rules.
- A check passed on input we made ourselves.

**Do:** create `CODING_STANDARDS.md` at the root with only the judgement rules no linter can hold:
1. A fake for an external service models that service's documented consistency. A read after a write needs a test with a lagging listing (`freezeListing`, `freezeSearch`).
2. A limit a validator enforces on model output is stated where the model reads it. Each one gets a test that ties the two, like `tells the model every limit validateSpec enforces`.
3. A check of an integration counts only when its input comes from the real producer: a real Jira event, not a body we signed ourselves.
4. A new guard ships with the test that fails without it. Show it red: remove the guard and run the test.

**Done when:** the file exists and `/code-review` quotes it.

## 5. `actionlint` locally, the same as in CI

**What happened:** `actionlint` is not installed locally. The agent downloaded it by hand, and only then found that CI's pinned version knows `app-id` but not `client-id`.

**Do:** a root script `pnpm lint:workflows` that downloads the pinned, checksum-verified 1.7.12 into `node_modules/.cache` (the same as `gates.yml`), runs it, and reuses the download.

**Done when:** `pnpm lint:workflows` passes locally with no manual download.

## 6. A runbook for the facts the agent looked up more than once

**Do:** `docs/runbook.md`, pointed at from `CURRENT.md` and from the stage files. It holds the lookups that cost calls today:
- `vercel logs requests --scope matiassemelmans-projects -p agentic-sdlc-factory --since 30m --json -q 'requestPath:"/api/jira"'`;
- Jira: cloud id `5e19d030-059b-4568-8a74-97843fe6853a`, board id 1;
- through the Atlassian MCP, labels come only with `view: "full"` or `responseFields`;
- where the secrets live (`~/.config/agentic-sdlc/`);
- the App check with a JWT;
- GitHub App settings: the private key is under **Credentials → Key pairs**, and the installation under **Install App**.

Fix `docs/stages/stage-001-004-build.md`, which said the key was under "General".

**Done when:** the runbook exists and `CURRENT.md` points to it.
