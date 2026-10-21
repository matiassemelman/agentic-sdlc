#!/usr/bin/env bash
# Waits for a factory workflow's next run to finish and prints what the factory did, in about ten lines:
#   scripts/watch-run.sh board.yml                 the first run newer than the newest one now
#   scripts/watch-run.sh build.yml 39528280442     the first run newer than that one
# It prints the run's card key or run number, its result, and the factory's own log lines, without the env dump.
# WATCH_TIMEOUT (seconds, default 3000) bounds the whole wait.
set -euo pipefail

workflow=${1:?usage: watch-run.sh <board.yml|build.yml|seed.yml> [after-run-id]}
list() { gh run list --workflow "$workflow" --limit 20 --json databaseId,status,conclusion,url "$@"; }
after=${2:-$(list --jq 'map(.databaseId) | max // 0')}
deadline=$(( $(date +%s) + ${WATCH_TIMEOUT:-3000} ))

# GitHub's run list lags behind a dispatch by a few seconds, so the run may not be listed yet.
id=""
until [ -n "$id" ]; do
  [ "$(date +%s)" -lt "$deadline" ] || { echo "No $workflow run newer than $after started in time."; exit 1; }
  id=$(list --jq "map(select(.databaseId > $after)) | min_by(.databaseId) | .databaseId // empty")
  [ -n "$id" ] || sleep 5
done

until [ "$(gh run view "$id" --json status --jq .status)" = completed ]; do
  [ "$(date +%s)" -lt "$deadline" ] || { echo "Run $id did not finish in time."; exit 1; }
  sleep 10
done

read -r conclusion url < <(gh run view "$id" --json conclusion,url --jq '"\(.conclusion) \(.url)"')
log=$(gh run view "$id" --log)
# What woke the run: the card key (Board) or the run issue (Build), from the step's env.
woke=$(grep -m1 -oP '^[^\t]+\t[^\t]+\t\S+ +(KEY|RUN|ADOPT): \K\S+' <<<"$log" || true)
echo "$workflow run $id (${woke:-no input}): $conclusion"
echo "$url"
# The factory's steps, without their env groups; errors from any step. The agent's own output is left out.
lines=$(awk -F'\t' '
  $2 ~ /^(Reconcile the board|Read the approved spec|The factory.s own evidence|Publish, or hand the run to a person|Run node packages\/stations\/src\/run-seed.ts.*)$/ || $3 ~ /##\[error\]/ {
    line = substr($3, index($3, " ") + 1)
    if (line ~ /^##\[group\]/) { skip = 1; next }
    if (line ~ /^##\[endgroup\]/) { skip = 0; next }
    if (!skip && line != "") print line
  }' <<<"$log")
echo "${lines:-(no factory log lines: nothing to do, or the run stopped before the factory's steps)}"
[ "$conclusion" = success ]
