#!/usr/bin/env bash
# Fails when a tracked file, or a commit message in RANGE, contains one of the private terms.
# The terms live in the PRIVATE_TERMS repository variable (one per line or comma-separated), never in
# the repo: writing them here would publish them. Output names only file:line or the commit, because
# a public repo's CI logs are public too.
#   PRIVATE_TERMS="a,b" RANGE=origin/main..HEAD scripts/check-private-terms.sh
set -euo pipefail

if [ -z "${PRIVATE_TERMS:-}" ]; then
  echo "PRIVATE_TERMS is not set: set the repository variable (Settings → Secrets and variables → Actions → Variables)."
  exit 1
fi

terms=$(mktemp)
trap 'rm -f "$terms"' EXIT
printf '%s\n' "$PRIVATE_TERMS" | tr ',' '\n' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | grep -v '^$' > "$terms"

found=0
# Not the pipeline's exit status: xargs answers 123 when any batch has no match, even if another has.
hits=$(git ls-files -z | xargs -0 grep -H -I -n -i -F -f "$terms" 2>/dev/null | cut -d: -f1,2 || true)
if [ -n "$hits" ]; then
  echo "Private terms in these lines:"
  printf '%s\n' "$hits"
  found=1
fi

if [ -n "${RANGE:-}" ]; then
  for sha in $(git rev-list "$RANGE"); do
    if git log -1 --format=%B "$sha" | grep -q -i -F -f "$terms"; then
      echo "Private terms in the message of commit $sha"
      found=1
    fi
  done
fi

if [ "$found" -eq 0 ]; then echo "No private terms."; fi
exit "$found"
