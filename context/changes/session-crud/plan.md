# Session CRUD Implementation Plan

## Overview

Let a user edit any session field, add their own session and delete sessions; the week re-validates on every change and shows violations inline without blocking the save (S-04, FR-010, FR-011, US-03).

> Implemented together with S-01/S-02 in one commit before this change folder existed; this folder documents the slice retroactively (2026-10-23) so the roadmap item has its own plan and progress record.

## Current State Analysis

Sessions are stored per plan (F-01); the rule engine returns named violations (F-02).

## Desired End State

`POST /api/sessions`, `PATCH /api/sessions/[id]`, `DELETE /api/sessions/[id]` with zod validation; validity badge recomputed server-side; `SessionForm.tsx` for add/edit.

## What We're NOT Doing

- Edits are never blocked by violations (PRD: show, don't block).
- Fixed commitments can only change status.

## Phase 1: Session API

**Files**: `src/pages/api/sessions/index.ts`, `src/pages/api/sessions/[id].ts`, `src/lib/validation.ts`.

### Success Criteria:

#### Automated Verification:

- `npm run test` passes (validation tests)
- `npx astro check` and `npm run lint` pass

## Phase 2: Session form and inline violations

**Files**: `src/components/plan/SessionForm.tsx`, `src/components/plan/WeekPlanner.tsx`.

### Success Criteria:

#### Automated Verification:

- `npm run build` passes
- E2E: edit a session into a violation and see it inline

## References

- `context/foundation/prd.md` FR-010, FR-011, US-03
- `context/foundation/roadmap.md` S-04

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Session API

#### Automated

- [x] 1.1 `npm run test` passes (validation tests) — 5fa9ff8
- [x] 1.2 `npx astro check` and `npm run lint` pass — 5fa9ff8

### Phase 2: Session form and inline violations

#### Automated

- [x] 2.1 `npm run build` passes — 5fa9ff8
- [x] 2.2 E2E: edit a session into a violation and see it inline — 2b45c92

