#!/usr/bin/env bash
# Waits for a PR's checks to finish and prints each job: its result, its runner, and how long it waited for one.
#   scripts/watch-pr.sh 37
# A job queued for more than 2 minutes with no runner gets one line, once: the cause is the runners or GitHub, not the
# change. WATCH_TIMEOUT (seconds, default 1800) bounds the whole wait.
set -euo pipefail

pr=${1:?usage: watch-pr.sh <pr number>}
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
deadline=$(( $(date +%s) + ${WATCH_TIMEOUT:-1800} ))
sha=$(gh pr view "$pr" --json headRefOid --jq .headRefOid)
jobs() { gh api "repos/$repo/actions/runs?head_sha=$sha" --jq '.workflow_runs[].jobs_url' | while read -r url; do gh api "$url" --jq '.jobs[]'; done; }
warned=""

# The checks list is empty for a few seconds after a push.
until gh pr checks "$pr" --json bucket --jq 'length > 0 and all(.bucket != "pending")' 2>/dev/null | grep -q true; do
  [ "$(date +%s)" -lt "$deadline" ] || { echo "PR #$pr: checks did not finish in time."; break; }
  stuck=$(jobs | jq -r --argjson now "$(date +%s)" \
    'select(.status == "queued" and .runner_name == null and ($now - (.created_at | fromdateiso8601)) > 120) | .name')
  if [ -n "$stuck" ] && [ -z "$warned" ]; then
    echo "Waiting for a runner for more than 2 minutes: $(paste -sd, <<<"$stuck")"
    warned=1
  fi
  sleep 15
done

echo "PR #$pr at ${sha:0:7}:"
jobs | jq -r '
  def secs(a; b): if a and b then ((b | fromdateiso8601) - (a | fromdateiso8601)) else null end;
  # A queued job already has a started_at; the runner starts with the first step.
  (.steps[0].started_at // null) as $ran
  | "- \(.name): \(.conclusion // .status) on \(.runner_name // "no runner"), waited \(secs(.created_at; $ran) // "?") s, ran \(secs($ran; .completed_at) // "?") s"'
