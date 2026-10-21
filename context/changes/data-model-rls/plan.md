# Data Model with RLS Implementation Plan

## Overview

Create the Supabase schema for TrainPlan (`goals`, `plans`, `sessions`) with row-level security scoped to `auth.uid()`, plus the TypeScript row types and a small data-access layer. Roadmap F-01, PRD Access Control and NFR-3 (a user never sees another user's data).

## Current State Analysis

`supabase/migrations/` is empty; `supabase/config.toml` exists. `src/lib/supabase.ts` creates an SSR client (cookie sessions) from `astro:env/server`. `src/middleware.ts` protects routes in `PROTECTED_ROUTES` and sets `locals.user`. No domain tables, no types.

## Desired End State

One migration creates three tables with RLS and per-operation policies; `src/db/database.types.ts` holds row types; `src/lib/services/*` repositories expose typed CRUD used by later slices. Verification: migration SQL applies on a Supabase project (manual, owner), `npx astro check` and `npm run lint` pass.

### Key Discoveries:

- `src/lib/supabase.ts` is generic (`createServerClient`), it can take a `Database` generic for typed queries.
- The starter's CLAUDE.md convention: migrations named `YYYYMMDDHHmmss_description.sql`, RLS with granular per-operation policies.

## What We're NOT Doing

- No history aggregates (S-06), no soft delete, no sharing.
- No seed data in production.

## Implementation Approach

Single migration, one week per `plans` row keyed by `(user_id, week_start)`, sessions belong to a plan. Policies: authenticated users can select/insert/update/delete only rows where `user_id = auth.uid()`; `sessions` check ownership through the parent plan's `user_id` (denormalised `user_id` column on sessions keeps policies simple and fast).

## Phase 1: Migration

### Changes Required:

#### 1. Migration

**File**: `supabase/migrations/20261021120000_init_trainplan.sql`

**Contract**: tables `goals` (one active goal per user: unique `user_id`), `plans` (`user_id`, `goal_id`, `week_start date`, unique `(user_id, week_start)`, `valid boolean`), `sessions` (`plan_id`, `user_id`, `day smallint 0-6`, `type`, `muscle_groups text[]`, `intensity`, `duration_min`, `description`, `status`, `locked boolean`, `source`). Enums as `check` constraints. `updated_at` triggers. RLS enabled on all three with four policies each (select/insert/update/delete for `authenticated`), `anon` gets nothing.

### Success Criteria:

#### Automated Verification:

- `npx supabase db lint` or SQL parses (dry run via `psql` not available; rely on `supabase db push` later)

#### Manual Verification:

- Migration applied to the hosted project without errors (owner)

---

## Phase 2: Types and repositories

### Changes Required:

#### 1. Row types

**File**: `src/db/database.types.ts`

**Intent**: Hand-written `Database` type mirroring the migration (regenerate with `supabase gen types` when a project is linked).

#### 2. Typed client

**File**: `src/lib/supabase.ts`

**Intent**: Pass `Database` generic; `App.Locals` gets `supabase` and `user`.

#### 3. Repositories

**File**: `src/lib/services/goals.ts`, `src/lib/services/plans.ts`

**Contract**: `getGoal(supabase, userId)`, `upsertGoal(supabase, userId, input)`, `getPlanForWeek(supabase, userId, weekStart)`, `savePlan(supabase, userId, goalId, weekStart, sessions, valid)`, `updateSession(...)`, `insertSession(...)`, `deleteSession(...)`, `listPlans(...)`. Mapping helpers between DB rows and `Session` domain type.

### Success Criteria:

#### Automated Verification:

- `npx astro check` passes
- `npm run lint` passes
- `npm run build` passes

---

## Testing Strategy

### Unit Tests:

- Row ↔ domain mapping helpers.

### Manual Testing Steps:

1. After S-01, sign in as two users and confirm each sees only their own goal.

## References

- `context/foundation/prd.md` §Access Control
- `context/foundation/roadmap.md` F-01

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Migration

#### Automated

- [ ] 1.1 Migration SQL written and lint-clean

#### Manual

- [ ] 1.2 Migration applied to the hosted project (owner)

### Phase 2: Types and repositories

#### Automated

- [ ] 2.1 `npx astro check` passes
- [ ] 2.2 `npm run lint` passes
- [ ] 2.3 `npm run build` passes
