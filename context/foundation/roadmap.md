---
project: "TrainPlan"
version: 1
status: active
created: 2026-10-21
updated: 2026-10-22
prd_version: 1
main_goal: speed
top_blocker: time
milestone_id: first-valid-week
milestone_seq: 1
milestone_status: open
---

# Roadmap: TrainPlan

> Derived from `context/foundation/prd.md` (v1) + `tech-stack.md` + auto-researched codebase baseline.
> Edit-in-place; the next milestone continues this file. Archive only when an independent roadmap replaces it.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-1: First valid week** — Status: open

- **Intent:** A signed-in user fills one goal form, gets a rule-valid weekly plan, ticks sessions, and the week re-plans itself after a skip; every must-have FR of the PRD is delivered and the app is deployed under a public URL.
- **Source materials:** `context/foundation/prd.md` (v1)
- **Done when:** every F-NN and S-NN below is `done`.
- **Scope anchors:** FR-001 to FR-011 (must-have), US-01 to US-04, NFR 1-5, Access Control.

## Vision recap

Planning a sensible training week by hand is slow and error-prone: the same muscle groups get loaded on consecutive days, the week is too heavy, and one skipped session kills the plan. TrainPlan keeps the decision layer: one goal form in, a validated week out, and automatic re-planning when reality intervenes. The product wedge (the one trait without which this is a generic workout log) is the rule engine that validates and re-composes the week.

## North star

**S-02: User generates a rule-valid weekly plan from the goal form** — the smallest end-to-end slice that proves the hypothesis "one form in, trustworthy week out"; placed right after auth and the goal form because everything else only matters if generation plus validation works. North star here means the smallest end-to-end slice whose delivery proves the core product hypothesis, placed as early as prerequisites allow.

## At a glance

| ID   | Change ID            | Outcome (user can …)                                            | Prerequisites | PRD refs                     | Status   |
| ---- | -------------------- | --------------------------------------------------------------- | ------------- | ---------------------------- | -------- |
| F-01 | data-model-rls       | (foundation) goals/plans/sessions tables with RLS and types     | —             | Access Control, NFR-3        | done           |
| F-02 | rule-engine          | (foundation) pure rule engine: load, validation, re-planning    | —             | Business Logic, FR-008/009   | done           |
| S-01 | goal-form            | create and edit their training goal                             | F-01          | FR-003, US-04                | done        |
| S-02 | generate-week        | generate a validated weekly plan with one action and see it     | S-01, F-02    | FR-004, FR-005, FR-008, US-01, NFR-1, NFR-5 | done        |
| S-03 | session-tracking     | mark sessions done/skipped and accept a re-planned week         | S-02          | FR-007, FR-009, US-02        | done        |
| S-04 | session-crud         | edit, add and delete sessions with inline violations            | S-02          | FR-010, FR-011, US-03        | done        |
| S-05 | regenerate-week      | regenerate the remaining week keeping done sessions             | S-03          | FR-006                       | done        |
| F-03 | deploy-production    | (foundation) app live on a public URL with secrets configured   | S-02          | infrastructure.md            | done        |
| S-06 | week-history         | see past weeks with done/skipped counts (nice-to-have)          | S-03          | FR-012                       | done        |

## Streams

| Stream | Theme            | Chain                                   | Note                                                       |
| ------ | ---------------- | --------------------------------------- | ---------------------------------------------------------- |
| A      | Data and goal    | `F-01` → `S-01`                         | Unblocks every user-facing slice; starts first.            |
| B      | Rules            | `F-02` → `S-02` → `S-03` → `S-05`       | The product wedge; S-02 joins Stream A after S-01.         |
| C      | Editing          | `S-04`                                  | Parallel with S-03 once S-02 is done.                      |
| D      | Ship and extras  | `F-03` → `S-06`                         | Deploy as soon as the north star works; history last.      |

## Baseline

What's already in place in the codebase as of 2026-10-21 (auto-researched from the 10x-astro-starter scaffold).

- **Frontend:** present — Astro 7 SSR + React 19 islands + Tailwind 4 + shadcn/ui button (`src/components/`, `src/layouts/Layout.astro`).
- **Backend / API:** partial — `src/pages/api/auth/*` only; no domain endpoints.
- **Data:** absent — no tables, no migrations (`supabase/migrations/` empty); Supabase CLI config present.
- **Auth:** present — email/password sign-up, sign-in, sign-out, `src/middleware.ts` with `PROTECTED_ROUTES`, `/dashboard` protected example.
- **Deploy / infra:** partial — `wrangler.jsonc` and Cloudflare adapter present; no account, no secrets, never deployed.
- **Observability:** partial — Workers observability flag on; no error tracking.
- **Tests:** absent — only `scripts/smoke.mjs` auth smoke; no Vitest/Playwright.

## Foundations

### F-01: Data model with RLS

- **Outcome:** (foundation) `goals`, `plans`, `sessions` tables exist with RLS policies scoped to `auth.uid()`, TypeScript entity/DTO types in `src/types.ts`, and a typed Supabase client.
- **Change ID:** data-model-rls
- **PRD refs:** Access Control, NFR-3, FR-003/005/007/010/011 (nouns)
- **Unlocks:** S-01, S-02, S-03, S-04; verification of the isolation guardrail.
- **Prerequisites:** —
- **Parallel with:** F-02
- **Blockers:** —
- **Unknowns:**
  - Is a hosted Supabase project available for applying migrations? — Owner: user. Block: no (migrations can be written and unit-tested logic does not need it).
- **Risk:** Getting RLS wrong later is expensive; doing it first makes isolation the default for every slice.
- **Status:** done

### F-02: Rule engine

- **Outcome:** (foundation) a pure, unit-tested module computes session load, weekly limit per level, validates a week (48 h same-muscle-group rule, weekly load limit, light day before fixed commitment) returning named violations, and proposes a re-plan for remaining days after a skip.
- **Change ID:** rule-engine
- **PRD refs:** Business Logic, FR-008, FR-009, US-01/02/03 acceptance criteria, Open Question 1
- **Unlocks:** S-02, S-03, S-04, S-05; the unit-test suite required for submission.
- **Prerequisites:** —
- **Parallel with:** F-01
- **Blockers:** —
- **Unknowns:**
  - Exact load points per intensity/duration and weekly limits per level — Owner: user (defaults proposed in plan). Block: no.
- **Risk:** Keeping the engine free of I/O and LLM calls is what makes it testable; mixing it into API routes would make the north star untestable.
- **Status:** done

### F-03: Production deployment

- **Outcome:** (foundation) the app is deployed to Cloudflare Workers with Supabase and OpenRouter secrets configured; the public URL serves sign-in and plan generation.
- **Change ID:** deploy-production
- **PRD refs:** NFR-4, infrastructure.md, deploy-plan.md
- **Unlocks:** public URL for submission; S-06 can be verified in production.
- **Prerequisites:** S-02, Cloudflare account, Supabase project, OpenRouter key
- **Parallel with:** S-03, S-04
- **Blockers:** owner must create the accounts and run `wrangler login`
- **Unknowns:** —
- **Risk:** Deploying only at the end hides workerd-only runtime issues; deploy as soon as the north star works.
- **Status:** done

## Slices

### S-01: Goal form

- **Outcome:** user can create and edit their one active training goal (goal text, level, available weekdays, fixed weekly commitment, notes) and is redirected to sign-in when logged out.
- **Change ID:** goal-form
- **PRD refs:** FR-003, US-04, Access Control
- **Prerequisites:** F-01
- **Parallel with:** F-02
- **Blockers:** —
- **Unknowns:** —
- **Risk:** First slice with real data; proves RLS and the zod-validated API route pattern used by every later slice.
- **Status:** done

### S-02: Generate week

- **Outcome:** user can press "Generate week" and see a 7-day plan with one session per available day (type, muscle groups, intensity, duration, description), already validated by the rule engine and marked valid, with progress feedback and a retry on failure.
- **Change ID:** generate-week
- **PRD refs:** FR-004, FR-005, FR-008, US-01, NFR-1, NFR-5
- **Prerequisites:** S-01, F-02
- **Parallel with:** —
- **Blockers:** OpenRouter API key for live generation (fixture-based generation works without it)
- **Unknowns:**
  - Which model gives structured output fast enough within 20 s? — Owner: team. Block: no (start with a small fast model, keep the id in config).
- **Risk:** North star; LLM output must be parsed and validated before it is shown, with a repair loop when the first draft violates rules.
- **Status:** done

### S-03: Session tracking and re-planning

- **Outcome:** user can mark a session done or skipped (and undo), and after a skip receives a re-plan proposal for the remaining days with a change summary that they can accept or reject.
- **Change ID:** session-tracking
- **PRD refs:** FR-007, FR-009, US-02
- **Prerequisites:** S-02
- **Parallel with:** S-04, F-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Re-planning must never touch done sessions; covered by engine unit tests before UI work.
- **Status:** done

### S-04: Session CRUD with inline violations

- **Outcome:** user can edit any session field, add their own session and delete sessions; the week re-validates on every change and shows violations inline.
- **Change ID:** session-crud
- **PRD refs:** FR-010, FR-011, US-03
- **Prerequisites:** S-02
- **Parallel with:** S-03, F-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Edits are saved even when invalid (PRD: show, don't block); the validity badge must be recomputed server-side.
- **Status:** done

### S-05: Regenerate week

- **Outcome:** user can regenerate the current week; sessions already marked done are preserved and only remaining days are regenerated.
- **Change ID:** regenerate-week
- **PRD refs:** FR-006
- **Prerequisites:** S-03
- **Parallel with:** S-04
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Reuses the S-02 generation path with a "locked days" input; small slice if S-02 was built with that parameter.
- **Status:** done

### S-06: Week history

- **Outcome:** user can see a plain list of past weeks with done/skipped counts.
- **Change ID:** week-history
- **PRD refs:** FR-012 (nice-to-have)
- **Prerequisites:** S-03
- **Parallel with:** F-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Last; cut first if time runs out.
- **Status:** done

## Backlog Handoff

| Roadmap ID | Change ID         | Suggested issue title                         | Ready for `/10x-plan` | Notes |
| ---------- | ----------------- | --------------------------------------------- | --------------------- | ----- |
| F-01       | data-model-rls    | Data model: goals, plans, sessions with RLS   | yes                   | Run `/10x-plan data-model-rls` |
| F-02       | rule-engine       | Rule engine: load, validation, re-planning    | yes                   | Run `/10x-plan rule-engine` |
| S-01       | goal-form         | Goal form (create/edit)                       | after F-01            | — |
| S-02       | generate-week     | Generate validated weekly plan                | after S-01, F-02      | North star |
| S-03       | session-tracking  | Done/skipped + re-plan proposal               | after S-02            | — |
| S-04       | session-crud      | Edit/add/delete sessions with violations      | after S-02            | — |
| S-05       | regenerate-week   | Regenerate remaining week                     | after S-03            | — |
| F-03       | deploy-production | First production deploy                       | after S-02            | Needs owner accounts |
| S-06       | week-history      | Past weeks list                               | after S-03            | Nice-to-have |

## Open Roadmap Questions

1. **Load points and weekly limits per level** — Owner: user. Block: none (defaults in F-02 plan).

## Parked

- **Exercise library, wearables, social, periodization, nutrition, native mobile** — Why parked: PRD §Non-Goals.
- **Multiple goals per user** — Why parked: PRD §Non-Goals.

## Milestone History

(empty on the first milestone)

## Done

- **F-01: (foundation) `goals`, `plans`, `sessions` tables exist with RLS policies scoped to `auth.uid()`, TypeScript entity/DTO types in `src/types.ts`, and a typed Supabase client.** — Archived 2026-10-22 → `context/archive/2026-10-21-data-model-rls/`. Lesson: —.
- **F-02: (foundation) a pure, unit-tested module computes session load, weekly limit per level, validates a week (48 h same-muscle-group rule, weekly load limit, light day before fixed commitment) returning named violations, and proposes a re-plan for remaining days after a skip.** — Archived 2026-10-22 → `context/archive/2026-10-21-rule-engine/`. Lesson: —.
- **S-01: user can create and edit their one active training goal (goal text, level, available weekdays, fixed weekly commitment, notes) and is redirected to sign-in when logged out.** — Archived 2026-10-22 → `context/archive/2026-10-21-goal-form/`. Lesson: —.
- **S-02: user can press "Generate week" and see a 7-day plan with one session per available day (type, muscle groups, intensity, duration, description), already validated by the rule engine and marked valid, with progress feedback and a retry on failure.** — Archived 2026-10-22 → `context/archive/2026-10-21-generate-week/`. Lesson: —.
- **S-03: user can mark a session done or skipped (and undo), and after a skip receives a re-plan proposal for the remaining days with a change summary that they can accept or reject.** — Archived 2026-10-22 → `context/archive/2026-10-23-session-tracking/`. Lesson: —.
- **S-04: user can edit any session field, add their own session and delete sessions; the week re-validates on every change and shows violations inline.** — Archived 2026-10-22 → `context/archive/2026-10-23-session-crud/`. Lesson: —.
- **S-05: user can regenerate the current week; sessions already marked done are preserved and only remaining days are regenerated.** — Archived 2026-10-22 → `context/archive/2026-10-23-regenerate-week/`. Lesson: —.
- **F-03: (foundation) the app is deployed to Cloudflare Workers with Supabase and OpenRouter secrets configured; the public URL serves sign-in and plan generation.** — Archived 2026-10-22 → `context/archive/2026-10-23-deploy-production/`. Lesson: —.
- **S-06: user can see a plain list of past weeks with done/skipped counts.** — Archived 2026-10-22 → `context/archive/2026-10-23-week-history/`. Lesson: —.
