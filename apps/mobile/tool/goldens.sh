#!/usr/bin/env bash
# Runs the golden-tagged tests. Goldens are made and checked on macOS with the pinned Flutter
# (the owner's Mac and the macOS CI runner), the one platform they are committed from
# (feature 007; decided 2026-11-11, replacing the Linux image in research R10).
#   tool/goldens.sh              check the app's goldens; fails on any change
#   tool/goldens.sh --update     rewrite the app's goldens (never the board references)
#   tool/goldens.sh test/goldens/screens/37_not_found_golden_test.dart   one file
set -euo pipefail

cd "$(dirname "$0")/.."
pinned="3.47.9"

if [ "$(uname -s)" != "Darwin" ]; then
  echo "goldens.sh: goldens are made and checked on macOS only (this is $(uname -s))." >&2
  exit 1
fi
actual="$(flutter --version --machine | sed -n 's/.*"frameworkVersion": *"\([^"]*\)".*/\1/p')"
if [ "$actual" != "$pinned" ]; then
  echo "goldens.sh: Flutter $pinned is pinned (apps/mobile/README.md); this machine has $actual." >&2
  exit 1
fi

args=()
for a in "$@"; do
  if [ "$a" = "--update" ]; then args+=(--update-goldens); else args+=("$a"); fi
done

GOLDENS=1 flutter test --tags golden "${args[@]+"${args[@]}"}"
