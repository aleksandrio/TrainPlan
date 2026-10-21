---
project: "TrainPlan"
researched_at: 2026-10-21
recommended_platform: cloudflare-workers
runner_up: vercel
context_type: greenfield
tech_stack: "Astro 7 SSR (@astrojs/cloudflare) + React 19 + Supabase + OpenRouter"
---

# Infrastructure decision

## Developer interview (answers recorded)

1. Persistent connections: not needed. Plan generation is a single request/response call to a hosted LLM (up to ~20 s); no websockets, no long-running jobs.
2. Cost sensitivity: high. Course project, must run on free tiers; zero fixed monthly cost.
3. Existing familiarity: the starter ships with `wrangler.jsonc` and `@astrojs/cloudflare`; course lessons use Wrangler. No prior production experience with any platform assumed.
4. Global reach: irrelevant for MVP (a few dozen users in Poland).
5. Co-location preference: database is Supabase (hosted, EU region), so the app platform does not need an integrated database; latency between edge and Supabase EU is acceptable.

Hard constraints from `tech-stack.md`: Node-compatible JS runtime with SSR, must run the `@astrojs/cloudflare` build output or require an adapter swap. Soft weights from `prd.md`: small scale, 20 s generation budget, cheap.

## Recommendation

**Cloudflare Workers (with static assets)** via `npx wrangler deploy`. The starter is already configured for it (adapter, `wrangler.jsonc`, `nodejs_compat`), the free plan covers 100k requests/day and the CLI/agent story is strong. Runner-up: Vercel (would require swapping to `@astrojs/vercel`). Third: Fly.io (Node adapter + Dockerfile, more ops).

## Scored comparison (checked 2026-10-21)

| Platform | Stack fit | CLI-first | Managed/serverless | Agent-readable docs | Scriptable deploy API | MCP / agent integration | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cloudflare Workers | Pass (adapter in starter) | Pass (`wrangler deploy`, `secret put`, `tail`) | Pass | Pass (developers.cloudflare.com markdown, `llms.txt`) | Pass (non-interactive with `CLOUDFLARE_API_TOKEN`) | Pass (official MCP servers) | Lead |
| Vercel | Partial (needs `@astrojs/vercel`) | Pass (`vercel --prod`) | Pass | Pass | Pass | Partial | Runner-up |
| Netlify | Partial (needs `@astrojs/netlify`) | Pass (`netlify deploy --prod`) | Pass | Pass | Pass | Partial | Viable |
| Fly.io | Partial (Node adapter + Dockerfile) | Pass (`flyctl`) | Partial (VMs) | Pass | Pass | Fail | Viable, more ops |
| Railway | Partial (Node adapter) | Partial | Partial | Partial | Partial | Fail | Dropped |
| Render | Partial (Node adapter) | Partial (dashboard-centric) | Partial | Partial | Partial | Fail | Dropped |

Status notes: Workers free plan 100k requests/day, 10 ms CPU per request on free (LLM call is I/O wait, not CPU, so it fits); Workers static assets are GA. Sources: Cloudflare pricing page (https://developers.cloudflare.com/workers/platform/pricing/), Astro framework guide on Cloudflare (https://developers.cloudflare.com/workers/framework-guides/web-apps/astro), Astro docs for `@astrojs/cloudflare` (https://docs.astro.build/en/guides/integrations-guide/cloudflare/).

## Anti-bias check on the leader

### Devil's advocate (Astro SSR on Cloudflare Workers)

1. 10 ms CPU limit on the free plan: a heavy zod parse plus re-planning on a large plan is still far below 10 ms, but rendering many React islands server-side could approach it; keep pages lean.
2. The LLM request must finish within the Worker's wall-clock allowance; a slow model could time out. Mitigation: pick a fast model, set `max_tokens`, and keep a 20 s client timeout with retry.
3. `nodejs_compat` does not cover every Node API; some npm packages (e.g. ones using `fs`) break only at runtime on `workerd`. Mitigation: `npm run dev` already runs on workerd, so breakage shows locally.
4. Secrets management is split (`.dev.vars` locally, `wrangler secret put` remotely); forgetting one produces a confusing runtime error rather than a build error.
5. The account-level API token must be scoped to Workers Scripts edit for this account only.

### Pre-mortem (six months later it failed)

The deployment "worked" on day one and then rotted. The first thing that went wrong was the Supabase free project pausing after a week of inactivity, so the public URL opened but every sign-in failed, and the project looked broken at review time. Second, OpenRouter credit ran out after a burst of regenerate clicks from a tester because there was no per-user rate limit; generation started failing silently and the UI showed an empty week. Third, a dependency upgrade in CI pulled a package that was fine under Node but crashed on workerd in production, and nobody ran `npm run preview` before merging because the deploy step was manual. Fourth, the Cloudflare API token was created with account-wide permissions and committed to `.dev.vars` by mistake; it had to be rotated under pressure. None of these were platform failures; all were missing guard rails: no uptime ping, no rate limit, no preview-on-workerd gate in CI, no scoped token.

### Unknown unknowns

1. Supabase free projects pause after inactivity; a cron ping or a quick restore before the review is needed.
2. Cloudflare's `wrangler deploy` for a Worker with assets uploads `dist/` each time; large public assets slow deploys (keep `public/` small).
3. Astro's `astro:env` secrets are read at request time on Workers; a missing secret does not fail the build.
4. OpenRouter model availability changes; pin a model id and keep a fallback id in config.
5. Cloudflare may require a verified account and sometimes phone verification before the first Worker deploy.

## Decision

Continue with the leader (Cloudflare Workers). Risks above are carried into the register.

## Operating model

- Preview: `npm run build && npm run preview` locally on workerd before every deploy; no separate preview environment for MVP.
- Secrets: `npx wrangler secret put SUPABASE_URL|SUPABASE_KEY|OPENROUTER_API_KEY`; locally in `.dev.vars` (gitignored).
- Rollback: `npx wrangler rollback` to the previous deployment version.
- Approval: deploys are run manually by the owner from the terminal; CI runs lint/check/build/smoke only.
- Logs: `npx wrangler tail` for live logs; Workers observability is enabled in `wrangler.jsonc`.

## Risk register

| Risk | Source | Mitigation |
| --- | --- | --- |
| Supabase project pauses when idle | Unknown unknowns | Restore the day before submission; optional uptime ping |
| OpenRouter credit exhausted by regenerate spam | Pre-mortem | Per-user generation limit (e.g. 10/day) in the API route; low credit cap |
| Package works on Node, breaks on workerd | Devil's advocate / Pre-mortem | Dev and preview run on workerd; CI smoke on preview |
| Missing secret shows at runtime only | Unknown unknowns | Deploy checklist step verifies all three secrets with `wrangler secret list` |
| LLM call exceeds time budget | Devil's advocate | Fast model, `max_tokens`, 20 s timeout, user-visible retry |
| Over-scoped API token leaks | Devil's advocate | Token scoped to Workers Scripts:Edit, stored only in env |
