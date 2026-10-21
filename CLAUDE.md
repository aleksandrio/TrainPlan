# Repository Guidelines

TrainPlan is a web app that turns one goal form into a validated weekly training plan and re-plans the week when a session is skipped. Stack: Astro 7 SSR + React 19 islands + TypeScript + Tailwind 4 + Supabase (auth, Postgres, RLS) + Cloudflare Workers. Product contract: @context/foundation/prd.md. Stack decision: @context/foundation/tech-stack.md.

## Hard rules

- Every table in `supabase/migrations/` has RLS enabled with per-operation policies scoped to `auth.uid()`. A user must never read or write another user's rows (PRD guardrail).
- The rule engine in `src/lib/services/rules/` is pure TypeScript with no I/O and no LLM calls; it is the only place that decides plan validity, load and re-planning. API routes call it, they never re-implement it.
- LLM output is untrusted input: parse it with a zod schema, then validate with the rule engine before persisting or showing it.
- Secrets (`SUPABASE_URL`, `SUPABASE_KEY`, `OPENROUTER_API_KEY`) live only in `.env` / `.dev.vars` / Cloudflare secrets, declared in `astro.config.mjs` `env.schema`. Never commit them, never read them client-side.
- API routes export `const prerender = false` and validate request bodies with zod before touching Supabase.
- Do not edit `context/archive/`. Foundation docs in `context/foundation/` are edited in place, never duplicated with dates.

## Project structure

- `src/pages/` Astro pages, `src/pages/api/` endpoints (uppercase `GET`/`POST` exports).
- `src/components/` Astro for static UI, React (`.tsx`) only for interactive islands; shadcn/ui primitives in `src/components/ui/` (`npx shadcn@latest add <name>`); hooks in `src/components/hooks/`.
- `src/lib/` helpers and services; `src/lib/supabase.ts` SSR client; `src/middleware.ts` resolves `locals.user` and protects routes listed in `PROTECTED_ROUTES`.
- `src/types.ts` shared entities and DTOs. `supabase/migrations/` SQL named `YYYYMMDDHHmmss_description.sql`.
- `context/` is the system of record for product and change docs (10x workflow: `foundation/` living docs, `changes/<id>/` per change, `archive/` immutable).

## Commands

- `npm run dev` dev server on the Cloudflare runtime; `npm run build` production build; `npm run preview` serve the build.
- `npm run lint` / `npm run lint:fix` ESLint (type-checked, React, Astro, a11y, Prettier); `npm run format` Prettier.
- `npm run test` Vitest unit tests (rule engine first); `npm run test:e2e` Playwright against a running dev server.
- `npx supabase start` local stack (Docker) or point `.env` at a hosted project; `npx wrangler deploy` to publish.

## Style and testing

- Path alias `@/*` → `src/*`. Merge Tailwind classes with `cn()` from `@/lib/utils`, never by string concatenation. No Next.js directives.
- Unit tests live next to the code as `*.test.ts`; E2E specs in `e2e/`. Test the rule engine with explicit week fixtures, assert on named violations, not on snapshot text.
- Husky + lint-staged run `eslint --fix` and `prettier --write` on commit.

## Commits and CI

- Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`), one change folder per feature under `context/changes/`.
- GitHub Actions (`.github/workflows/ci.yml`) runs lint, `astro check`, build and the auth smoke test on push and PR to `master`; the build job needs `SUPABASE_URL` and `SUPABASE_KEY` repository secrets.
