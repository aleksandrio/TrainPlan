# UI Redesign Implementation Plan

## Overview

Replace the 10x-astro-starter "cosmic" look (navy gradient, purple glass cards, rounded corners) with a visual system inspired by mega.dev: near-black page, hairline borders, zero border radius, one red accent reserved for "needs you" (primary action, rule issues, heavy intensity, today), a serif display face for headings and figures, and monospaced uppercase labels for meta.

## Design tokens

- Page `#050505`, surface `#111111`, surface-2 `#1b1b1b`, line `#2f2f2f`, line-strong `#4a4a52`
- Ink `#f2f2ee`, body `#d9d9d4`, muted `#a6a6af`
- Accent `#ff2a1a` (+ `#ff5a4d` for text on dark), ok `#4ade80`, warn `#fbbf24`
- Fonts (self-hosted via `@fontsource`, no third-party request): Instrument Serif (display), Geist (body), Geist Mono (labels)
- Session card left edge = intensity (grey light, white moderate, red heavy); dashed border = fixed commitment; green edge + check = done; struck through = skipped

## What We're NOT Doing

- No light theme / theme toggle (single committed dark look).
- No changes to API routes, services, rule engine, migrations or tests.

## Phase 1: Tokens and shell

**File**: `src/styles/global.css` — tokens in `:root` + `@theme inline`, font imports, `bg-grid`, `bg-hatch`, `label`, `corner-marks` utilities.
**File**: `src/layouts/Layout.astro`, `AppLayout.astro`, new `AuthLayout.astro`, `src/components/Topbar.astro`, `Banner.astro`.

## Phase 2: Screens

**File**: `src/components/Welcome.astro` — landing hero on hairline grid + three real product steps (replaces starter feature cards).
**File**: `src/pages/auth/*.astro`, `src/components/auth/*` — two-column auth plate.
**File**: `src/pages/app/goal.astro`, `src/components/goal/GoalForm.tsx` — form as a spec table (mono label column, hairline rows, level tiles with load caps).
**File**: `src/pages/app/index.astro`, `src/components/plan/WeekPlanner.tsx`, `SessionForm.tsx` — stats strip (status, load bar, sessions), alert band (re-plan, rule issues, change summary), seven hairline day columns with serif day numbers and today marker.
**File**: `src/pages/app/history.astro` — one row per week with a segmented done/skipped/planned bar.
**File**: `src/pages/dashboard.astro` — account page in the app shell (kept for the smoke test).

### Success Criteria:

#### Automated Verification:

- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` pass
- `npm run test:e2e` and `scripts/smoke.mjs` pass with no changes to the specs

#### Manual Verification:

- Desktop and 400px mobile screenshots of every screen reviewed

## Progress

### Phase 1: Tokens and shell

- [x] Tokens, fonts, utilities, layouts, topbar, banner

### Phase 2: Screens

- [x] Landing, auth, goal, week, history, account
- [x] lint / typecheck / unit / build green
- [x] E2E + smoke green (sandbox: in-memory Supabase stand-in; re-run against local Supabase before archiving)
- [ ] Deploy and re-check on production
