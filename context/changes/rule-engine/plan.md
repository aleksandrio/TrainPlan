# Rule Engine Implementation Plan

## Overview

Build the pure TypeScript rule engine that is TrainPlan's product wedge: computing session load, validating a week against the three domain rules (48 h same-muscle-group regeneration, weekly load limit per level, light day before the fixed commitment) and proposing a re-plan after a skipped session. No I/O, no LLM, fully unit-tested. Roadmap F-02, PRD Business Logic, FR-008, FR-009.

## Current State Analysis

The scaffold has no domain code and no test runner (`package.json` scripts: dev/build/preview/lint/format/smoke). `src/types.ts` does not exist yet; `CLAUDE.md` reserves `src/lib/services/rules/` for the engine and `*.test.ts` next to code for unit tests.

## Desired End State

`src/lib/services/rules/` exports `sessionLoad`, `weeklyLimit`, `validateWeek`, `replanAfterSkip` (and `applyReplan`), typed with the shared domain types from `src/types.ts`. `npm run test` runs Vitest and all engine tests pass. Verification: `npm run test`, `npm run lint`, `npx astro check`.

### Key Discoveries:

- `tsconfig.json` extends `astro/tsconfigs/strict` with `@/*` alias; Vitest needs the same alias via `vite-tsconfig-paths` or an inline alias.
- ESLint uses type-checked rules with `projectService`; test files must be included in the TS project (they are, under `src/`).
- Domain defaults (PRD Open Question 1): load points = `ceil(durationMin / 30) * factor` with factor light 1, moderate 2, heavy 3; weekly limits beginner 16, intermediate 24, advanced 32; a fixed commitment is a locked `team_sport` session, intensity heavy, muscle groups legs + cardio.

## What We're NOT Doing

- No database access, no Supabase client, no OpenRouter call.
- No UI. No multi-week periodization. No exercise-level details.

## Implementation Approach

Phase 1 defines shared types and installs Vitest. Phase 2 implements load + validation with tests written from the PRD acceptance criteria (US-01, US-03). Phase 3 implements re-planning (US-02) on top of validation: remove the skipped session, try to move it to a free available day later in the week that keeps the week valid, else drop it with an explanation; done sessions are never touched.

## Critical Implementation Details

- **Week geometry**: days are 0 (Monday) to 6 (Sunday). The "day before the fixed commitment" wraps (`(fixedDay + 6) % 7`) so a Monday commitment makes Sunday light. The 48 h rule means two heavy sessions sharing a muscle group may not be on the same or adjacent days (`|dayA - dayB| <= 1`); the week is not treated as cyclic for this rule.
- **Violations are data**: each violation has `rule` (`regeneration-48h` | `weekly-load` | `light-before-commitment`), `days` and a one-sentence `message` (PRD: every violation explained in one sentence).

## Phase 1: Types and test runner

### Overview

Shared domain types and Vitest wiring.

### Changes Required:

#### 1. Shared types

**File**: `src/types.ts`

**Intent**: Single source of domain types used by engine, API routes and UI.

**Contract**: `Level`, `Weekday` (0-6), `MuscleGroup` (`legs|push|pull|core|cardio`), `Intensity`, `SessionType` (`strength|cardio|mobility|plyometrics|team_sport|other`), `SessionStatus` (`planned|done|skipped`), `Session` (`id, day, type, muscleGroups, intensity, durationMin, description, status, locked`), `GoalInput` (`goalText, level, availableDays, fixedCommitment: {day, label} | null, notes`), `Violation`, `WeekValidation`, `ReplanProposal`.

#### 2. Vitest

**File**: `package.json`, `vitest.config.ts`

**Intent**: `npm run test` runs Vitest once; `npm run test:watch` watches. Alias `@/*` resolved.

### Success Criteria:

#### Automated Verification:

- `npm run test` runs and reports 0 tests or a trivial smoke test passing
- `npm run lint` passes
- `npx astro check` passes

---

## Phase 2: Load and validation

### Overview

`sessionLoad`, `weeklyLimit`, `validateWeek` with tests.

### Changes Required:

#### 1. Load

**File**: `src/lib/services/rules/load.ts`

**Contract**: `sessionLoad(session): number`, `weeklyLimit(level): number`, `weekLoad(sessions): number` (skipped sessions count 0).

#### 2. Validation

**File**: `src/lib/services/rules/validate.ts`

**Contract**: `validateWeek(sessions, goal): WeekValidation` → `{ valid: boolean, load: number, limit: number, violations: Violation[] }`. Skipped sessions are ignored by every rule. Locked team-sport sessions participate in the 48 h rule.

#### 3. Tests

**File**: `src/lib/services/rules/validate.test.ts`, `load.test.ts`

**Intent**: Fixtures from US-01 and US-03; one test per rule plus a fully valid week.

### Success Criteria:

#### Automated Verification:

- `npm run test` passes with tests covering each rule and the valid case
- `npm run lint` passes

---

## Phase 3: Re-planning after skip

### Overview

`replanAfterSkip` produces a proposal with a change summary; `applyReplan` returns the new session list.

### Changes Required:

#### 1. Re-plan

**File**: `src/lib/services/rules/replan.ts`

**Contract**: `replanAfterSkip(sessions, goal, skippedSessionId, today: Weekday): ReplanProposal` → `{ sessions: Session[], changes: {day, action: 'moved'|'dropped'|'kept', reason}[], validation: WeekValidation }`. Rules: done and locked sessions never change; the skipped session's content is moved to the earliest available day `> today` with no session where the week stays valid; otherwise it is dropped with reason naming the blocking rule; the proposal's validation must be valid or the proposal is marked `validation.valid=false` and every remaining violation is listed.

#### 2. Tests

**File**: `src/lib/services/rules/replan.test.ts`

**Intent**: US-02 fixture (heavy legs Tue + Fri, skip Tue), done-session immutability, no-free-day drop case, commitment-day avoidance.

### Success Criteria:

#### Automated Verification:

- `npm run test` passes including re-plan tests
- `npm run lint` passes

---

## Testing Strategy

### Unit Tests:

- Load: per intensity/duration, skipped excluded, limits per level.
- Validation: each rule in isolation, combined, locked team-sport participation, wrap-around of the day before a Monday commitment.
- Re-plan: move to free day, avoid day before commitment, avoid adjacency, drop when no day fits, done sessions untouched.

### Manual Testing Steps:

1. None; pure module.

## References

- `context/foundation/prd.md` §Business Logic, US-01..03
- `context/foundation/roadmap.md` F-02

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Types and test runner

#### Automated

- [x] 1.1 `npm run test` runs — 48113e0
- [x] 1.2 `npm run lint` passes — 48113e0
- [x] 1.3 `npx astro check` passes — 48113e0

### Phase 2: Load and validation

#### Automated

- [x] 2.1 `npm run test` passes with rule coverage — 48113e0
- [x] 2.2 `npm run lint` passes — 48113e0

### Phase 3: Re-planning after skip

#### Automated

- [x] 3.1 `npm run test` passes including re-plan tests — 48113e0
- [x] 3.2 `npm run lint` passes — 48113e0
