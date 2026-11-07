#!/usr/bin/env bash
# FR-036: the site uses logical CSS so Arabic (RTL) mirrors correctly.
# Fails when a physical left/right utility or property appears in site code.
set -euo pipefail
cd "$(dirname "$0")/.."

roots=(apps/web/src/app/\(site\) apps/web/src/modules apps/web/src/shared)
# Tailwind physical utilities (ml-4, pr-2, left-0, -right-2, text-right, border-l, rounded-r-md, float-left…)
b='(^|[[:space:]"'"'"'`{:!])'
tw="${b}-?((m[lr]|p[lr]|scroll-[mp][lr]|left|right)-([0-9]|\\[|px|auto|full)|(border-[lr]|rounded-[lr]|rounded-[tb][lr]|text-(left|right)|float-(left|right)|clear-(left|right))([-[:space:]\"'\`}]|$))"
# CSS physical properties
css='(margin|padding|border)-(left|right)[[:space:]]*:|(^|[;{[:space:]])(left|right)[[:space:]]*:|text-align:[[:space:]]*(left|right)|float:[[:space:]]*(left|right)'

status=0
if grep -rnE --include='*.tsx' --include='*.ts' "$tw" "${roots[@]}" | grep -vE '\.test\.tsx?:|/admin/components/|:[0-9]+:[[:space:]]*(//|\*|/\*)'; then
  echo "error: physical Tailwind utilities found; use ms/me/ps/pe/start/end/text-start/text-end" >&2
  status=1
fi
if grep -rnE --include='*.css' "$css" "${roots[@]}"; then
  echo "error: physical CSS properties found; use margin-inline-start/inset-inline-end/text-align:start" >&2
  status=1
fi
[ "$status" -eq 0 ] && echo "logical CSS: ok"
exit "$status"
