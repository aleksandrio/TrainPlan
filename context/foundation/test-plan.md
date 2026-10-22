# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-10-22

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the risk wins. The rule engine is pure code: unit tests there beat any browser test. E2E is reserved for the one critical user path.
2. **User concerns are first-class evidence.** The owner's stated worry ("the plan must never silently break the 48 h rule or load another user's data") carries the same weight as PRD lines.
3. **Risks are scenarios, not code locations.** This plan documents what could fail and why it is likely; `/10x-research` per rollout phase decides where in code a failure lives.

Hot-spot scope used for likelihood weighting: `src/lib/services/`, `src/pages/api/`, `src/components/plan/`, `supabase/migrations/` (all created this week; churn is uniform, so likelihood is judged by complexity and external boundaries).

## 2. Risk Map

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|---|---|---|---|
| 1 | A generated or edited week is shown as "valid" although two heavy sessions on the same muscle group are adjacent, the load limit is exceeded, or the eve of the commitment is heavy | High | High | PRD §Business Logic, US-01/03, interview: owner's main concern |
| 2 | Re-planning after a skip changes a session already marked done or produces an invalid week | High | Medium | PRD US-02 acceptance criteria |
| 3 | A signed-in user reads or modifies another user's goal, plan or sessions through an API route (IDOR) | High | Medium | PRD §Access Control, NFR-3, abuse lens |
| 4 | LLM output that is malformed, missing days or rule-breaking is persisted or crashes generation, leaving the user with no plan | High | High | PRD NFR-5, tech-stack note on untrusted output, external boundary |
| 5 | Signup / signin / protected-route redirects break after a dependency upgrade (auth smoke) | Medium | Medium | starter smoke test history, `src/pages/api/` boundary |
| 6 | Repeated "Regenerate" clicks exhaust OpenRouter credit or exceed the 20 s budget | Medium | Medium | infrastructure.md risk register |
| 7 | Week boundaries computed wrongly around Sunday/Monday or timezone, so today's sessions land in the wrong week | Medium | Low | PRD FR-005 week view, date handling in services |

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|---|---|---|---|---|---|
| #1 | Named violations for each rule on explicit week fixtures; a fully valid week yields none | "the generator never produces adjacent heavy days" | rule engine entry points, fixtures from PRD user stories | unit | asserting on message snapshots only |
| #2 | Done sessions byte-identical after re-plan; proposal validation valid or violations listed | "the LLM handles re-planning" | re-plan contract, status transitions | unit + e2e (accept flow) | mocking the engine in the e2e |
| #3 | Second user gets 404/empty for first user's ids; RLS policies deny cross-user rows | "the route filters by user so RLS is optional" | RLS policies, repository filters, API route ownership checks | integration (two accounts) + manual check | testing only the happy path with one user |
| #4 | Malformed JSON, missing days and rule-breaking drafts all end in a valid template week with a note | "the model always follows the JSON schema" | zod schema, repair loop, fallback | unit (fake fetch) | calling the real API in tests |
| #5 | Signup→signin→protected page→signout over HTTP against a real Supabase | "auth is the starter's problem" | auth routes, middleware redirects | smoke script in CI | duplicating the flow in Playwright |
| #6 | Per-user generation limit returns 429 and the UI explains it | "nobody will click that often" | generation route, rate-limit storage | unit + manual | time-based flaky tests |
| #7 | `weekStartOf` / `weekdayOf` on Sunday 23:59 UTC and Monday 00:00 UTC | "local time equals UTC" | mappers, how `today` reaches the UI | unit | snapshotting dates |

## 3. Phased Rollout

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|---|---|---|---|---|---|
| 1 | Critical-path coverage | Rule engine, generation fallback and validation schemas under unit tests | #1, #2, #4, #7 | unit | complete | `context/changes/rule-engine/`, `context/changes/generate-week/` |
| 2 | Critical user flow E2E | One Playwright flow: signup → goal → generate → skip + re-plan → edit into violation | #1, #2, #5 | e2e + smoke | complete | `context/changes/generate-week/` |
| 3 | Isolation and abuse | Two-account API test proving RLS and ownership checks; generation rate limit | #3, #6 | integration + unit | not started | — |
| 4 | Quality-gates wiring | Post-edit hook (lint + related tests) and end-of-turn gate; CI already runs lint, check, unit, smoke, e2e | cross-cutting | post-edit-hook, gates | complete | `.claude/settings.json`, `.claude/hooks/` (proved 2026-10-21: unused var blocked post-edit, type error blocked stop) |

## 4. Stack

| Layer | Tool | Version | Notes |
|---|---|---|---|
| unit + integration | Vitest | 4.x | `npm run test`; alias `@/*` via vite-tsconfig-paths |
| API mocking | none (fake `fetch` injected into the OpenRouter client) | n/a | keeps tests offline |
| e2e | Playwright | 1.x | `npm run test:e2e`; needs a reachable Supabase with confirmations off |
| auth smoke | `scripts/smoke.mjs` | n/a | dependency-free HTTP walk, runs in CI against the preview |
| accessibility | eslint-plugin-jsx-a11y | 6.x | lint-time only; no axe run yet |

**Stack grounding tools (current session):**
- Docs: none (local manifests and installed package versions checked); checked: 2026-10-21
- Search: web search used for Cloudflare/Astro deployment facts only; checked: 2026-10-21
- Runtime/browser: Playwright CLI available in CI; Playwright MCP not used; checked: 2026-10-21
- Provider/platform: GitHub Actions workflow with Supabase CLI (local stack in CI); checked: 2026-10-21

## 5. Quality Gates

| Gate | Where | Required? | Catches |
|---|---|---|---|
| lint + typecheck (`npm run lint`, `astro check`) | local + CI | required | syntactic / type drift |
| unit (`npm run test`) | local + CI | required (Phase 1) | rule and schema regressions |
| auth smoke (`npm run smoke`) | CI (local Supabase) | required (Phase 2) | broken auth / middleware |
| e2e critical flow (`npm run test:e2e`) | CI (local Supabase) | required (Phase 2) | broken critical user path |
| post-edit hook (`.claude/hooks/post-edit.sh`: eslint --fix + sibling test) and end-of-turn gate (`end-of-turn.sh`: lint, unit, astro check) | local (agent loop) | wired (Phase 4) | regressions at edit time |
| pre-prod smoke | before `wrangler deploy` | manual (deploy-plan.md) | environment-specific failures |

## 6. Cookbook Patterns

### 6.1 Adding a unit test

- **Location**: next to the module, `*.test.ts` (e.g. `src/lib/services/rules/validate.test.ts`).
- **Fixtures**: use `session()` and `goalUS01` from `src/lib/services/rules/fixtures.ts`; build weeks explicitly per rule.
- **Assert** on `violation.rule` and `days`, then on the one-sentence message when the PRD fixes the wording.
- **LLM paths**: inject `fetchImpl` into `generateWeek({ llm: { ..., fetchImpl } })`; never hit the network.

### 6.2 Adding an E2E test

- **Location**: `e2e/*.spec.ts`; select by `data-testid` (`generate-button`, `validity-badge`, `day-<n>`, `session-card`, `replan-dialog`).
- **Accounts**: sign up a fresh `e2e-<timestamp>@example.com` per test; confirmations must be off.
- **Run**: `npm run build && npm run test:e2e` (starts the preview) or `BASE_URL=... npm run test:e2e` against a running server.

### 6.3 Adding an integration test (Phase 3)

TBD — see §3 Phase 3 (two Supabase accounts via service calls; assert cross-user reads return nothing).

## 7. Out of scope

Visual diff and multimodal review (UI is small; cost > signal for MVP), load testing, accessibility audits beyond lint.

## 8. Refresh triggers

Re-run `/10x-test-plan --refresh` when a new rule is added to the engine, when the generation provider changes, or when a rollout phase closes.
