# Week History Implementation Plan

## Overview

Let a user see a plain list of past weeks with done/skipped counts (S-06, FR-012, nice-to-have).

> Implemented together with S-01/S-02 in one commit before this change folder existed; this folder documents the slice retroactively (2026-10-22) so the roadmap item has its own plan and progress record.

## Current State Analysis

Plans are stored per week (F-01).

## Desired End State

`/app/history` lists past weeks with done / skipped / planned counts.

## What We're NOT Doing

- No charts or statistics beyond counts.

## Phase 1: History page

**Files**: `src/pages/app/history.astro`, `src/layouts/AppLayout.astro`.

### Success Criteria:

#### Automated Verification:

- `npm run build` and `npx astro check` pass

## References

- `context/foundation/prd.md` FR-012
- `context/foundation/roadmap.md` S-06

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: History page

#### Automated

- [x] 1.1 `npm run build` and `npx astro check` pass — 5fa9ff8

