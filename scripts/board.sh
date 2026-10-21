#!/usr/bin/env bash
# Reads the board without the Atlassian MCP, with a read-only token:
#   scripts/board.sh              every card not in Done, plus the cards that reached Done in the last 2 days
#   scripts/board.sh KAN-6        one card: its fields and its history of moves (who, from, to)
#   scripts/board.sh 'jql…'       the cards a JQL query returns
# Credentials: ~/.config/agentic-sdlc/jira-read.env (mode 600) with JIRA_EMAIL and JIRA_READ_TOKEN, a scoped API
# token with read:jira-work only. It never moves a card: moves go through the factory or a person.
set -euo pipefail

env=~/.config/agentic-sdlc/jira-read.env
[ -f "$env" ] || { echo "board.sh: no $env (see docs/runbook.md, Jira)." >&2; exit 2; }
# shellcheck source=/dev/null
. "$env"
base="https://api.atlassian.com/ex/jira/5e19d030-059b-4568-8a74-97843fe6853a/rest/api/3"
call() { curl -sf -u "$JIRA_EMAIL:$JIRA_READ_TOKEN" -H 'accept: application/json' -H 'content-type: application/json' "$@"; }
row='"\(.key)\t\(.fields.status.name)\t\(.fields.parent.key // "-")\t\(.fields.labels | join(","))\t\(.fields.assignee.displayName // "-")\t\(.fields.summary)"'

if [[ ${1:-} =~ ^[A-Z][A-Z0-9]*-[0-9]+$ ]]; then
  call "$base/issue/$1?fields=summary,status,labels,parent,assignee" | jq -r "$row"
  call "$base/issue/$1/changelog?maxResults=100" |
    jq -r '.values[] | .created as $at | .author.displayName as $by | .items[] | select(.field == "status") | "  \($at[0:19]) \($by): \(.fromString) → \(.toString)"'
  exit
fi

jql=${1:-'project = KAN AND (statusCategory != Done OR status changed to Done after -2d) ORDER BY key ASC'}
printf 'KEY\tSTATUS\tEPIC\tLABELS\tASSIGNEE\tSUMMARY\n'
call -X POST "$base/search/jql" -d "$(jq -n --arg jql "$jql" '{jql: $jql, fields: ["summary", "status", "labels", "parent", "assignee"], maxResults: 100}')" |
  jq -r ".issues[] | $row"
