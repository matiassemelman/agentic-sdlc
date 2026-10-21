#!/usr/bin/env bash
# Lints the workflows with the pinned, checksum-verified actionlint, locally (pnpm lint:workflows) and in the fast
# gates. The binary is downloaded once into node_modules/.cache and reused. Linux x86_64 only, like CI.
set -euo pipefail

VERSION=1.7.12
SHA256=8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8
root=$(cd "$(dirname "$0")/.." && pwd)
bin="$root/node_modules/.cache/actionlint/$VERSION/actionlint"

if [ ! -x "$bin" ]; then
  [ "$(uname -sm)" = "Linux x86_64" ] || { echo "actionlint.sh pins the linux_amd64 build only; this is $(uname -sm)." >&2; exit 1; }
  dir=$(dirname "$bin")
  mkdir -p "$dir"
  curl -sSfL -o "$dir/actionlint.tgz" "https://github.com/rhysd/actionlint/releases/download/v${VERSION}/actionlint_${VERSION}_linux_amd64.tar.gz"
  echo "${SHA256}  $dir/actionlint.tgz" | sha256sum -c --quiet -
  tar xzf "$dir/actionlint.tgz" -C "$dir" actionlint
  rm "$dir/actionlint.tgz"
fi

cd "$root"
"$bin" -color "$@"
