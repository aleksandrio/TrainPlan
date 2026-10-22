# Regenerate Week Implementation Plan

## Overview

Let a user regenerate the current week while keeping sessions already marked done (S-05, FR-006).

> Implemented together with S-01/S-02 in one commit before this change folder existed; this folder documents the slice retroactively (2026-10-22) so the roadmap item has its own plan and progress record.

## Current State Analysis

Generation (S-02) accepts locked sessions through the `keep` option of `generateWeek`.

## Desired End State

`POST /api/plan/generate` with `keepDone: true` keeps done sessions and regenerates the rest; counts against the daily generation limit.

## What We're NOT Doing

- No partial regeneration of a single day.

## Phase 1: Regenerate with kept sessions

**Files**: `src/pages/api/plan/generate.ts`, `src/lib/services/generation/index.ts`, `src/components/plan/WeekPlanner.tsx`.

### Success Criteria:

#### Automated Verification:

- `npm run test` passes including generation tests
- `npm run build` passes

## Phase 2: Daily generation limit

**Files**: `src/lib/services/plans.ts` (`reserveGeneration`, `GENERATIONS_PER_DAY`), migration.

### Success Criteria:

#### Automated Verification:

- `npm run test` and `npm run lint` pass

## References

- `context/foundation/prd.md` FR-006
- `context/foundation/roadmap.md` S-05
- `context/foundation/test-plan.md` risk 6

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Regenerate with kept sessions

#### Automated

- [x] 1.1 `npm run test` passes including generation tests — 5fa9ff8
- [x] 1.2 `npm run build` passes — 5fa9ff8

### Phase 2: Daily generation limit

#### Automated

- [x] 2.1 `npm run test` and `npm run lint` pass — 2ed468c

