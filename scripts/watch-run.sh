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
# The factory's own lines ("KAN-3: spec posted", "run #19: escalated (...)"), the evidence's rows and every error,
# outside the env groups. By content, not by step: gh sometimes names every step "UNKNOWN STEP".
lines=$(awk -F'\t' '
  {
    line = substr($3, index($3, " ") + 1)
    if (line ~ /^##\[group\]/) { skip = 1; next }
    if (line ~ /^##\[endgroup\]/) { skip = 0; next }
    if (!skip && (line ~ /^(run #[0-9]+|[A-Z][A-Z0-9]*-[0-9]+): / || line ~ /^Stopped: / || line ~ /^\| AC-[0-9]+ / || line ~ /##\[error\]/)) print line
  }' <<<"$log")
if [ -n "$lines" ]; then echo "$lines"; else echo "(no factory log lines: nothing to do, or the run stopped before the factory steps)"; fi
[ "$conclusion" = success ]
