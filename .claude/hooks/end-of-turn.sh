#!/usr/bin/env bash
# Stop hook: when files changed this turn, run lint, unit tests and typecheck once. Exit 2 blocks the stop.
set -u
payload=$(cat)
active=$(printf '%s' "$payload" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(String(JSON.parse(d).stop_hook_active??false))}catch{process.stdout.write("false")}})')
[ "$active" = "true" ] && exit 0
cwd=$(printf '%s' "$payload" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(JSON.parse(d).cwd??"")}catch{}})')
root=$(git -C "${cwd:-.}" rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0
changed=$(git status --porcelain -- src e2e supabase 2>/dev/null | wc -l | tr -d ' ')
[ "$changed" = "0" ] && exit 0
export NO_COLOR=1 FORCE_COLOR=0
fail=0
for step in "npm run -s lint" "npm run -s test" "npx astro check"; do
  out=$($step 2>&1); code=$?
  if [ $code -ne 0 ]; then printf '[end-of-turn] %s failed:\n%s\n' "$step" "$out" | tail -80 >&2; fail=1; fi
done
[ $fail -ne 0 ] && exit 2
exit 0
