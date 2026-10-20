#!/usr/bin/env bash
# Prints the latest spec the factory posted on a run issue, without the base64 data block.
#   scripts/show-spec.sh 8
set -euo pipefail
gh issue view "${1:?usage: scripts/show-spec.sh <run issue number>}" --json comments \
  --jq '[.comments[] | select(.body | contains("<!-- factory:spec v1"))][-1].body // "No spec on this issue."' |
  sed -E 's/ data=[A-Za-z0-9+\/=]+ -->/ -->/'
