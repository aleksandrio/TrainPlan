# Deploy plan: first production deployment (Cloudflare Workers)

Based on `context/foundation/infrastructure.md` and `context/foundation/tech-stack.md`. Steps marked **manual** need the owner's account; the rest an agent runs from the terminal.

## Prerequisites (manual gates)

1. **manual** Supabase project exists; `Project URL` and `anon` key at hand; email confirmation disabled (Authentication → Email → Confirm email off). Migrations from `supabase/migrations/` applied (`npx supabase db push` with the project linked, or pasted into the SQL editor).
2. **manual** OpenRouter API key created with a small credit limit.
3. **manual** Cloudflare account created; `npx wrangler login` completed once on the owner's machine (or `CLOUDFLARE_API_TOKEN` with Workers Scripts:Edit scope exported in the shell).

## Automated steps

4. `npm ci && npm run lint && npm run build` - must be green.
5. `npm run preview` and open `http://localhost:4321` - sign-up, sign-in, generate week work against the hosted Supabase using `.dev.vars`.
6. `npx wrangler secret put SUPABASE_URL`, `npx wrangler secret put SUPABASE_KEY`, `npx wrangler secret put OPENROUTER_API_KEY` (values pasted interactively by the owner, never echoed).
7. `npx wrangler secret list` - all three names present.
8. `npx wrangler deploy` - note the printed `*.workers.dev` URL. (This is a Worker with static assets, not Cloudflare Pages; do not use `wrangler pages deploy`.)

## Verification

9. Open the public URL: landing page renders; `/dashboard` redirects to `/auth/signin` when logged out.
10. Sign up with a fresh email, sign in, save a goal, generate a week; plan appears and is marked valid.
11. `npx wrangler tail` while repeating step 10 - no uncaught errors.
12. Record the public URL in `README.md` and in the submission notes.

## Rollback

`npx wrangler rollback` to the previous version; secrets are unaffected.

## Execution log

- 2026-10-22: steps 1-3 done by the owner (hosted Supabase project `trainplan` in eu-west-1, migration pushed, `wrangler login`), secrets set, `npx wrangler deploy` succeeded. Public URL: https://trainplan.kowal-alek.workers.dev. Verification (steps 9-11) pending: run `BASE_URL=https://trainplan.kowal-alek.workers.dev npm run smoke` and the manual sign-up / generate check.
