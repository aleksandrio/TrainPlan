#!/usr/bin/env bash
# PostToolUse hook (Write|Edit): lint the edited file and run its sibling unit test, if any.
# Output goes to stderr and any failure exits 2 so the agent sees it.
set -u
payload=$(cat)
file=$(printf '%s' "$payload" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const j=JSON.parse(d);process.stdout.write(j.tool_input?.file_path??"")}catch{}})')
[ -z "$file" ] && exit 0
root=$(git -C "$(dirname "$file")" rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0
case "$file" in
  *.ts|*.tsx|*.astro) ;;
  *) exit 0 ;;
esac
export NO_COLOR=1 FORCE_COLOR=0
out=$(npx eslint --fix "$file" 2>&1); code=$?
if [ $code -ne 0 ]; then printf 'eslint failed for %s\n%s\n' "$file" "$out" >&2; exit 2; fi
test_file="${file%.ts}.test.ts"
if [ -f "$test_file" ] && [ "$test_file" != "$file" ]; then
  out=$(npx vitest run "$test_file" 2>&1); code=$?
  if [ $code -ne 0 ]; then printf 'vitest failed for %s\n%s\n' "$test_file" "$out" | tail -60 >&2; exit 2; fi
fi
exit 0
