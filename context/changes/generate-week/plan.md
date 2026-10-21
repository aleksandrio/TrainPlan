# Generate Week Implementation Plan

## Overview

North star (S-02, FR-004/005/008, US-01, NFR-1/5): one click turns the goal into a validated 7-day plan. An LLM (OpenRouter) drafts the week as structured JSON; the rule engine validates it; one repair round feeds violations back; if the model is unavailable or still invalid, a deterministic template planner produces a valid week so the product never shows a blank screen.

## Current State Analysis

Rule engine (F-02), repositories (F-01) and the goal form (S-01) exist. No LLM client, no plan UI.

## Desired End State

`POST /api/plan/generate` creates or replaces the current week's plan (keeping sessions marked done when `keepDone` is true) and returns `{ plan, validation, source: "llm" | "template" }`. `/app` shows the week as 7 columns with the validity badge and the violation list, a "Generate week" button with progress state and error + retry.

### Key Discoveries:

- The fixed commitment becomes a locked `team_sport` session (heavy, legs + cardio) inserted by the server before validation; the model is told not to plan it.
- `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` are optional server secrets in `astro.config.mjs` `env.schema`; absence selects the template planner (keeps CI and E2E deterministic).

## What We're NOT Doing

- No streaming, no multi-week plans, no exercise lists beyond a short description.

## Critical Implementation Details

- **Timing**: the OpenRouter call has a 20 s timeout (`AbortController`); on timeout the template planner answers so NFR-1 holds.
- **Untrusted output**: model JSON is parsed with `generatedWeekSchema` (zod); any parse failure counts as an invalid draft.

## Phase 1: Generation service

**File**: `src/lib/services/generation/template.ts` — `templateWeek(goal, locked)`: fills available days (excluding the commitment day), puts a light mobility session on the day before the commitment if available, alternates legs / push / pull / cardio, heavy legs at least two days from the commitment and from other heavy legs; trims intensity until the weekly limit holds.
**File**: `src/lib/services/generation/openrouter.ts` — `draftWeekWithLlm(goal, locked, violations?)`: prompt + JSON response, zod parse.
**File**: `src/lib/services/generation/index.ts` — `generateWeek(goal, locked, opts)`: llm → validate → repair once → template fallback; returns sessions + validation + source.
**File**: `src/lib/services/generation/template.test.ts` — template is valid for several goals (with/without commitment, all levels, 1-7 days).

### Success Criteria:

#### Automated Verification:

- `npm run test` passes including template planner tests
- `npx astro check` and `npm run lint` pass

## Phase 2: API route and week UI

**File**: `src/pages/api/plan/generate.ts` — auth, load goal (400 if none), compute `weekStart` (UTC Monday), keep done sessions when requested, call `generateWeek`, `savePlan`, respond.
**File**: `src/pages/api/plan.ts` — `GET` current week plan + validation.
**File**: `src/pages/app/index.astro` + `src/components/plan/WeekPlanner.tsx` — week grid, badge, violations, generate button with spinner, error + retry.

### Success Criteria:

#### Automated Verification:

- `npm run build` passes

#### Manual Verification:

- With a goal saved, "Generate week" shows a valid week within 20 s (template path without key)

## References

- `context/foundation/prd.md` US-01, NFR-1, NFR-5
- `context/foundation/roadmap.md` S-02

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Generation service

#### Automated

- [ ] 1.1 `npm run test` passes including template planner tests
- [ ] 1.2 `npx astro check` and `npm run lint` pass

### Phase 2: API route and week UI

#### Automated

- [ ] 2.1 `npm run build` passes

#### Manual

- [ ] 2.2 "Generate week" shows a valid week within 20 s
