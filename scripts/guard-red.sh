#!/usr/bin/env bash
# Shows a guard red (CODING_STANDARDS.md, rule 4): takes the guard out, runs the tests, puts it back.
#
#   scripts/guard-red.sh <file> <exact text of the guard> <replacement> <test file>
#
# The text must occur exactly once in the file, so a typo cannot fake a guard that guards nothing.
# Prints RED and the failing tests (exit 0), or GREEN when nothing failed (exit 1). The file is always restored.
set -euo pipefail

if [ $# -ne 4 ]; then
  sed -n '4p' "$0" | sed 's/^# *//' >&2
  exit 2
fi
file=$(realpath "$1") old=$2 new=$3 test=$(realpath "$4")

count=$(python3 -c 'import sys; print(open(sys.argv[1]).read().count(sys.argv[2]))' "$file" "$old")
if [ "$count" != 1 ]; then
  echo "guard-red: the guard's text occurs $count times in $file; it must occur exactly once." >&2
  exit 2
fi

backup=$(mktemp)
cp "$file" "$backup"
trap 'cp "$backup" "$file"; rm -f "$backup"' EXIT
python3 -c 'import sys; p, a, b = sys.argv[1:]; s = open(p).read(); open(p, "w").write(s.replace(a, b, 1))' "$file" "$old" "$new"

# Vitest runs from the package that holds the test.
pkg=$(dirname "$test")
until [ -f "$pkg/package.json" ]; do pkg=$(dirname "$pkg"); done
if out=$(cd "$pkg" && npx vitest run "$test" 2>&1); then
  echo "GREEN: every test passed without the guard, so no test guards it."
  exit 1
fi
echo "RED: without the guard, these fail:"
grep -E '^ +×' <<<"$out" || grep -E 'FAIL|Error' <<<"$out" | head -5
