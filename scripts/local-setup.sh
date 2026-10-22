#!/usr/bin/env bash
# One-shot local setup: start Supabase (Docker), write env files, install, build, run unit + e2e tests.
# Usage: bash scripts/local-setup.sh               (first run)
#        bash scripts/local-setup.sh --skip-start  (Supabase already running)
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "${1:-}" != "--skip-start" ]; then
  echo "▶ Starting local Supabase (Docker)…"
  npx supabase start -x studio,imgproxy,edge-runtime,logflare,vector,realtime,storage-api,postgres-meta,supavisor
fi

echo "▶ Writing .env and .dev.vars from supabase status…"
npx supabase status -o env | grep -E '^(API_URL|ANON_KEY)=' > .supabase.env
# shellcheck disable=SC1091
source .supabase.env
API_URL=${API_URL//\"/}; ANON_KEY=${ANON_KEY//\"/}
{
  echo "SUPABASE_URL=$API_URL"
  echo "SUPABASE_KEY=$ANON_KEY"
  echo "# optional: set to use AI generation; empty = deterministic template planner"
  echo "OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-}"
  echo "OPENROUTER_MODEL=${OPENROUTER_MODEL:-openai/gpt-4o-mini}"
} > .env
cp .env .dev.vars
rm -f .supabase.env
echo "   SUPABASE_URL=$API_URL"

echo "▶ Installing dependencies…"
npm ci
echo "▶ Generating Astro types (astro:env, astro:middleware)…"
npx astro sync
echo "▶ Lint, typecheck, unit tests…"
npm run lint
npx astro check
npm run test
echo "▶ Build…"
npm run build
echo "▶ Playwright browser…"
npx playwright install chromium
echo "▶ E2E tests against the production preview…"
npm run test:e2e
echo
echo "✅ All green. Next: npm run dev → http://localhost:4321  (Studio: http://localhost:54323)"
