# Goal Form Implementation Plan

## Overview

Let a signed-in user create and edit their single active training goal (S-01, FR-003, US-04). First slice touching real data; establishes the protected `/app` area, the zod-validated JSON API pattern and the 401 behaviour for API routes.

## Current State Analysis

Auth pages and `/dashboard` exist; `PROTECTED_ROUTES` redirects to `/auth/signin`. Repositories `getGoal` / `upsertGoal` exist (F-01). No zod dependency yet.

## Desired End State

`/app/goal` renders a React form prefilled with the current goal; submit calls `POST /api/goal` (JSON) which validates with zod, upserts and returns the goal. `/app` (week page) links to the goal form when no goal exists. Unauthenticated access to `/app*` redirects; to `/api/goal` returns 401.

## What We're NOT Doing

- No multiple goals, no deletion of the goal (non-goal).

## Phase 1: API and middleware

**File**: `src/middleware.ts` — add `/app` to protected routes; for `/api/*` except `/api/auth/*` return `401 { error }` instead of redirecting.
**File**: `src/lib/validation.ts` — zod schemas: `goalInputSchema` (goalText 3-500, level enum, availableDays 1-7 unique weekdays, fixedCommitment nullable `{day, label 1-100}`, notes ≤ 1000).
**File**: `src/pages/api/goal.ts` — `GET` returns goal or null, `POST` upserts.

### Success Criteria:

#### Automated Verification:

- `npm run test` passes (validation schema tests)
- `npx astro check` and `npm run lint` pass

## Phase 2: Pages and form island

**File**: `src/layouts/AppLayout.astro` — shell with topbar (email, Week, Goal, Sign out).
**File**: `src/pages/app/goal.astro` + `src/components/goal/GoalForm.tsx` — controlled form, inline errors, saves via fetch, redirects to `/app` on success.
**File**: `src/pages/index.astro` — landing links to `/app` when signed in.

### Success Criteria:

#### Automated Verification:

- `npm run build` passes

#### Manual Verification:

- Two users see only their own goal (needs hosted Supabase)

## References

- `context/foundation/prd.md` FR-003, US-04
- `context/foundation/roadmap.md` S-01

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: API and middleware

#### Automated

- [x] 1.1 `npm run test` passes (validation schema tests) — 4fcdbd6
- [x] 1.2 `npx astro check` and `npm run lint` pass — 4fcdbd6

### Phase 2: Pages and form island

#### Automated

- [x] 2.1 `npm run build` passes — 77d5b74

#### Manual

- [ ] 2.2 Two users see only their own goal (needs hosted Supabase)
