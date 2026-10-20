#!/usr/bin/env bash
# Creates (or updates) the labels the factory keeps its state in. Safe to run again.
set -euo pipefail
repo="${1:-matiassemelman/agentic-sdlc}"
label() { gh label create "$1" --repo "$repo" --color "$2" --description "$3" --force >/dev/null; echo "$1"; }

label run 1c3d30 "A ticket's trip through the factory"
for t in guest-filter stay-total usd-prices; do label "ticket:$t" d4d5cf "Which prepared ticket the run builds"; done
label station:spec e2e3df "The spec station is writing the spec"
label station:spec-approval fbca04 "Waiting for the product owner to approve the spec on the board"
label station:build e2e3df "The build station is writing the code"
label outcome:rejected 6e7781 "The product owner rejected the spec"
label outcome:failed 6e7781 "A station failed and the run stopped"
