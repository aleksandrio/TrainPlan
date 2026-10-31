# TrainPlan

One goal form in, a validated training week out. TrainPlan turns a goal (level, available days, fixed weekly activity) into a 7-day plan, checks it against three rules (48 h regeneration between heavy sessions on the same muscle group, a weekly load limit per level, a light day before your fixed activity), and re-plans the rest of the week when you skip a session.

Built for the 10xDevs 4 course project. Public URL: **https://trainplan.kowal-alek.workers.dev** (Cloudflare Workers, deployed 2026-10-22; see `context/deployment/deploy-plan.md`). Source: https://github.com/aleksandrio/TrainPlan.

## Features

- Email + password accounts; every user sees only their own data (Supabase RLS).
- Goal form → "Generate week": an LLM (OpenRouter) drafts the week as JSON, the rule engine validates it, one repair round fixes violations, and a deterministic template planner is the fallback (also used when no API key is configured).
- Week view with validity badge and one-sentence explanations of every violation.
- Mark sessions done / skipped; after a skip the app proposes a re-plan with a change summary you can accept or reject.
- Edit, add and delete sessions (violations show inline, nothing is blocked), regenerate the remaining week keeping done sessions, plain history of past weeks.

## Tech stack

Astro 7 SSR + React 19 islands + TypeScript + Tailwind 4 + Supabase (auth, Postgres, RLS) + Cloudflare Workers. Tests: Vitest (rule engine, generation, validation), Playwright (critical user flow), auth smoke script. Context docs for AI agents live in `context/` (PRD, tech stack, infrastructure, roadmap, test plan, per-change plans) and `CLAUDE.md`.

## Getting started

```bash
npm install
cp .env.example .env && cp .env.example .dev.vars   # fill SUPABASE_URL, SUPABASE_KEY (anon), optionally OPENROUTER_API_KEY
npx supabase link --project-ref <ref> && npx supabase db push   # or paste supabase/migrations/*.sql into the SQL editor
npm run dev
```

In the Supabase dashboard disable **Authentication → Email → Confirm email** so sign-up signs the user in immediately.

## Scripts

- `npm run dev` / `npm run build` / `npm run preview`
- `npm run lint`, `npx astro check`
- `npm run test` (unit), `npm run test:e2e` (Playwright; `BASE_URL` to target a running server), `npm run smoke`

## Deployment

Cloudflare Workers via `npx wrangler deploy`; secrets with `npx wrangler secret put SUPABASE_URL|SUPABASE_KEY|OPENROUTER_API_KEY`. Step-by-step plan in `context/deployment/deploy-plan.md`.

## Project workflow (10xDevs)

`/10x-shape` → `/10x-prd` → `/10x-tech-stack-selector` → `/10x-bootstrapper` → `/10x-agents-md` → `/10x-infra-research` → `/10x-roadmap` → per slice `/10x-new` → `/10x-plan` → `/10x-implement` → `/10x-test-plan` → hooks → E2E. Artifacts: `context/foundation/*.md`, `context/changes/<id>/plan.md`.

## AI code review (10xDevs M5)

Every pull request to `main` is reviewed by an LLM agent (`reviewer/`, AI SDK `ToolLoopAgent` + OpenRouter, cheapest structured-output model by default). The workflow `.github/workflows/review.yml` scores six criteria, comments on the PR, sets `ai-cr:passed` / `ai-cr:failed` and fails the check on `fail`; add the `ai-cr:review` label to re-run. Needs the `LLM_PROVIDER_API_KEY` repository secret. Prompt evals across models: `cd reviewer && npm run eval`. Details in `reviewer/README.md`.

## License

MIT (starter: [10x-astro-starter](https://github.com/przeprogramowani/10x-astro-starter)).
