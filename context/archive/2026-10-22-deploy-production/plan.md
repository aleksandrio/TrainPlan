# Production Deployment Plan

## Overview

Deploy the app to Cloudflare Workers with Supabase and OpenRouter secrets configured (F-03, NFR-4). Step-by-step runbook: `context/deployment/deploy-plan.md`.

> Implemented together with S-01/S-02 in one commit before this change folder existed; this folder documents the slice retroactively (2026-10-22) so the roadmap item has its own plan and progress record.

## Current State Analysis

`wrangler.jsonc` and the Cloudflare adapter came with the starter; no account, secrets or deploy before 2026-10-22.

## Desired End State

Public URL https://trainplan.kowal-alek.workers.dev serves sign-in and plan generation against the hosted Supabase project `trainplan` (eu-west-1).

## What We're NOT Doing

- No custom domain.
- No staging environment.

## Phase 1: Hosted Supabase and secrets

Migrations pushed to the hosted project; `wrangler secret put` for SUPABASE_URL, SUPABASE_KEY, OPENROUTER_API_KEY (owner, manual).

### Success Criteria:

#### Automated Verification:

- `npm run lint` and `npm run build` green before deploy

#### Manual Verification:

- Hosted Supabase project created, migrations applied, secrets set

## Phase 2: Deploy and verify

`npx wrangler deploy`; README updated with the public URL.

### Success Criteria:

#### Automated Verification:

- README and deploy plan record the public URL

#### Manual Verification:

- Sign-up and week generation work on the public URL

## References

- `context/deployment/deploy-plan.md`
- `context/foundation/infrastructure.md`
- `context/foundation/roadmap.md` F-03

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Hosted Supabase and secrets

#### Automated

- [x] 1.1 `npm run lint` and `npm run build` green before deploy — 15a1dba

#### Manual

- [x] 1.2 Hosted Supabase project created, migrations applied, secrets set — done by owner 2026-10-22

### Phase 2: Deploy and verify

#### Automated

- [x] 2.1 README and deploy plan record the public URL — 15a1dba

#### Manual

- [x] 2.2 Sign-up and week generation work on the public URL — verified by owner 2026-10-22

