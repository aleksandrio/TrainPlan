# Session Tracking and Re-planning Implementation Plan

## Overview

Let a user mark sessions done or skipped (and undo), and after a skip propose a re-plan of the remaining days with a change summary to accept or reject (S-03, FR-007, FR-009, US-02).

> Implemented together with S-01/S-02 in one commit before this change folder existed; this folder documents the slice retroactively (2026-10-22) so the roadmap item has its own plan and progress record.

## Current State Analysis

Week view and generation exist (S-02). The rule engine already exposes `replan` (F-02) with unit tests that guarantee done sessions are never moved.

## Desired End State

`PATCH /api/sessions/[id]` changes status; `POST /api/plan/replan` returns a proposal with a change summary, `PUT /api/plan/replan` accepts it. `WeekPlanner.tsx` shows done/skipped toggles and the proposal dialog.

## What We're NOT Doing

- No automatic re-plan without user confirmation.
- No notifications.

## Phase 1: Status API and re-plan endpoints

**Files**: `src/pages/api/sessions/[id].ts`, `src/pages/api/plan/replan.ts`, `src/lib/services/plans.ts`.

### Success Criteria:

#### Automated Verification:

- `npm run test` passes including re-plan tests
- `npx astro check` and `npm run lint` pass

## Phase 2: Week UI

**Files**: `src/components/plan/WeekPlanner.tsx`, `src/components/plan/api.ts`.

### Success Criteria:

#### Automated Verification:

- `npm run build` passes
- E2E: skip a session and accept the re-plan

#### Manual Verification:

- Skip -> proposal -> accept works in the browser

## References

- `context/foundation/prd.md` FR-007, FR-009, US-02
- `context/foundation/roadmap.md` S-03
- `e2e/week.spec.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Status API and re-plan endpoints

#### Automated

- [x] 1.1 `npm run test` passes including re-plan tests — 5fa9ff8
- [x] 1.2 `npx astro check` and `npm run lint` pass — 5fa9ff8

### Phase 2: Week UI

#### Automated

- [x] 2.1 `npm run build` passes — 5fa9ff8
- [x] 2.2 E2E: skip a session and accept the re-plan — 2b45c92

#### Manual

- [x] 2.3 Skip -> proposal -> accept works in the browser — e2e green on local Supabase 2026-10-22, see aac82e8

