---
project: "TrainPlan"
context_type: greenfield
created: 2026-10-21
updated: 2026-10-21
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: "pain category"
      decision: "decision paralysis + workflow friction: planning the week by hand and abandoning it after one missed session"
    - topic: "primary persona scope"
      decision: "hobby niche: amateur athletes training 3-4x/week after hours without a coach; the author is one of them"
    - topic: "auth strategy"
      decision: "email + password login; flat user model; strict per-user data isolation"
    - topic: "plan generation"
      decision: "AI generates the weekly plan as structured data; the application's own rule engine validates and re-plans"
    - topic: "MVP scope"
      decision: "one week at a time; no multi-week periodization; no exercise library; no wearables"
  frs_drafted: 12
  quality_check_status: accepted
---

# Shape notes: TrainPlan

Seed idea (verbatim): "planer treningowy - użytkownik podaje cel, dostępne dni i poziom, aplikacja generuje tygodniowy plan, potem tylko odhacza treningi, a silnik reguł pilnuje regeneracji, limitu obciążenia i przeplanowuje tydzień po pominiętej sesji. Minimum wkładu użytkownika, maksimum wartości."

## Vision & Problem Statement

Pain:        Planning a sensible training week by hand takes time and is easy to get wrong: the same muscle groups get loaded on consecutive days, the week is too heavy for the person's level, and after one skipped session the whole plan is abandoned.
Person:      An amateur athlete who trains 3-4 times a week after work without a coach (gym, running, one fixed team-sport slot per week).
Moment:      Sunday evening when the week is being planned, and mid-week when a session is skipped and the rest of the week no longer makes sense.
Cost today:  Plans live in the head or in a notes app; there is no check against overload or regeneration rules, and re-planning after a missed day is done ad hoc or not at all.

Insight: the valuable part is not logging workouts (every fitness app does that) but the decision layer: given a goal, available days, level and fixed commitments, what should this week look like, and how does it change when reality intervenes. The user should type one short form and then only tick sessions as done or skipped.

Scale note (Socratic, 100x users): the domain rule does not change with scale; per-user plans are independent. Only generation cost and latency matter at scale.

## User & Persona

Primary persona: "Alek, 30+, trains after hours". Works remotely, trains gym twice a week, runs once a week, plays volleyball every Monday evening. Goal: better conditioning and vertical jump for Monday games. No coach, no wearable integration, plans the week himself and often overloads legs the day before volleyball. Reaches for the product on Sunday evening to get a week plan, and during the week to tick sessions and see what to do next.

## Access Control

Login with email and password (sign-up and sign-in). Flat user model: there is a single role "user". Every user sees and manages only their own goals, plans and sessions. An unauthenticated visitor hitting any app route is redirected to the sign-in screen. No admin role, no sharing, no guest access.

Smallest access model that keeps the MVP useful: per-account isolation is required because the product is meant for many independent people, each with their own plan.

## Success Criteria

MVP first flow (locked):

1. User signs up / signs in.
2. User fills a goal form: goal description, level (beginner / intermediate / advanced), available weekdays, fixed commitment (e.g. "volleyball every Monday 19:00"), optional notes (injuries, equipment).
3. User presses "Generate week" and sees a plan for the current week: one session per available day with type, target muscle groups, intensity (light / moderate / heavy), duration and a short description.
4. User marks a session as done or skipped.
5. After a skip, the app re-plans the remaining days of the week and shows what changed and why (rule explanations).
6. User can edit, add or delete a session; the app re-validates and flags any rule violation.

Timeline: 2 weeks of after-hours work (hard deadline 2026-11-04). The flow is within the three-week budget; no timeline acknowledgment needed.

### Primary
- A new user gets a complete, rule-valid weekly plan within 2 minutes of signing up, having filled exactly one form.
- After marking a session as skipped, the remaining week is re-planned without any rule violation and the user is told what changed.

### Secondary
- Users keep using the app for a second week (the week history is kept and a new week can be generated).
- Generated plan descriptions are good enough that the user does not need to edit them in most cases.

### Guardrails
- A user never sees another user's data.
- A plan that violates a regeneration or load rule is never shown as "valid"; violations are always visible.
- Plan generation gives visible progress feedback and does not leave the user on a blank screen if generation fails.

## Functional Requirements

### Authentication
- FR-001: Visitor can sign up with email and password. Priority: must-have
  > Socrates: Counter-argument considered: "passwordless or OAuth is less friction." Resolution: kept; email + password is the simplest model to ship and test in two weeks.
- FR-002: User can sign in and sign out. Priority: must-have
  > Socrates: Counter-argument considered: "a local profile without server would be enough for one person." Resolution: kept; the product must serve many independent users.

### Goal
- FR-003: User can create and edit their training goal (goal text, level, available weekdays, fixed weekly commitment, notes). Priority: must-have
  > Socrates: Counter-argument considered: "one goal per user is too limiting." Resolution: kept at one active goal; multiple goals are a non-goal for MVP.

### Plan generation
- FR-004: User can generate a weekly plan from the goal with one action. Priority: must-have
  > Socrates: Counter-argument considered: "generation could produce unsafe plans." Resolution: kept; every generated plan is validated by the rule engine before it is shown (FR-008).
- FR-005: User can see the plan as a week view with one session per planned day, each with type, muscle groups, intensity, duration and description. Priority: must-have
  > Socrates: Counter-argument considered: "a list is enough, a calendar is UI cost." Resolution: kept as a simple 7-column week; no drag and drop.
- FR-006: User can regenerate the plan for the current week. Priority: must-have
  > Socrates: Counter-argument considered: "regeneration loses done sessions." Resolution: kept; sessions already marked done are preserved, only remaining days are regenerated.

### Session tracking and CRUD
- FR-007: User can mark a session as done or skipped, and undo that. Priority: must-have
  > Socrates: Counter-argument considered: "skipped vs not done yet is confusing." Resolution: kept; three states: planned, done, skipped.
- FR-008: Application validates every plan (generated or edited) against the rules and shows violations with an explanation. Priority: must-have
  > Socrates: Counter-argument considered: "validation makes editing annoying." Resolution: kept; violations are shown, not blocked, except the plan cannot be marked valid.
- FR-009: After a session is skipped, the application re-plans the remaining days of the week and shows what changed and why. Priority: must-have
  > Socrates: Counter-argument considered: "users may want to just skip without re-planning." Resolution: kept; re-planning is proposed with a one-click accept, the user can keep the old plan.
- FR-010: User can edit a session (type, muscle groups, intensity, duration, description, day). Priority: must-have
  > Socrates: Counter-argument considered: "editing generated content is rare." Resolution: kept; it is the "update" of CRUD and makes the plan the user's own.
- FR-011: User can add their own session to the week and delete any session. Priority: must-have
  > Socrates: Counter-argument considered: "adding sessions breaks the generated structure." Resolution: kept; added sessions go through the same validation.
- FR-012: User can see the history of past weeks with done / skipped counts. Priority: nice-to-have
  > Socrates: Counter-argument considered: "history is the first step to scope creep (stats, charts)." Resolution: downgraded to nice-to-have; only a plain list.

## User Stories

### US-01: User generates a weekly plan from a goal

- **Given** a signed-in user with a saved goal (level: intermediate, days: Tue, Thu, Fri, Sat, fixed: volleyball Monday evening)
- **When** they press "Generate week"
- **Then** they see a plan with one session on each available day, and the plan passes all rules

#### Acceptance Criteria
- Each planned session shows type, muscle groups, intensity, duration and description
- No two heavy sessions targeting the same muscle group are closer than 48 hours
- The day before the fixed commitment (Sunday) is light or rest
- Total weekly load does not exceed the limit for the user's level
- The plan is marked "valid" and no violation is listed

### US-02: User skips a session and gets a re-planned week

- **Given** a valid weekly plan with a heavy legs session on Thursday and a heavy legs session on Saturday
- **When** the user marks Thursday as skipped and accepts re-planning
- **Then** the remaining days are re-planned so that the week still respects all rules, and the change summary names what moved (or was dropped) and why

#### Acceptance Criteria
- Sessions already marked done are not changed
- The change summary lists each modified day with the rule that motivated the change
- The user can reject the proposal and keep the current plan

### US-03: User edits a session into a rule violation

- **Given** a valid plan with a heavy legs session on Thursday
- **When** the user changes Friday's session to heavy legs
- **Then** the plan shows a violation "48 h regeneration: legs (Thu heavy, Fri heavy)" and the plan is no longer marked valid

### US-04: Unauthenticated visitor

- **Given** a visitor who is not signed in
- **When** they open the plan page
- **Then** they are redirected to the sign-in screen

## Business Logic

The application composes and continuously re-composes a user's training week so that at least 48 hours separate two heavy sessions targeting the same muscle group, the total weekly load stays within the limit for the user's level, and the day before a fixed team activity is light or rest.

Inputs the rule consumes: the user's level, available weekdays, fixed weekly commitment, the sessions of the current week (each with day, muscle groups, intensity, duration, status). Load of a session is derived from intensity and duration (heavy counts more than light); the weekly limit depends on level.

Output: a weekly plan with a validity verdict and a list of violations, each naming the rule and the days involved. When a session is skipped, the rule produces a re-planning proposal for the remaining days that restores validity and keeps the goal's emphasis (for example: a skipped heavy legs session is moved to the next day that keeps 48 h from other heavy legs work and is not the day before the team activity).

How the user meets it: on generation (the plan shown is already valid), on every edit (violations appear inline), and on skip (a proposal with a change summary). The user never has to know the rules to benefit from them, but every violation is explained in one sentence.

## Non-Functional Requirements

- The weekly plan appears within 20 seconds of pressing "Generate week", with continuous visible progress feedback while it is being prepared.
- Any other user action (tick, edit, re-plan accept) is acknowledged within 500 ms.
- A user's goals, plans and sessions are never visible to another account.
- The product is usable on the latest two versions of mainstream desktop browsers and on a phone-width screen.
- If plan generation fails, the user keeps their previous plan and sees a clear error with a retry.

## Non-Goals

- No exercise library with videos or step-by-step technique: sessions carry a short free-text description; the user knows how to train.
- No wearable, Strava or calendar integrations: the only input is the goal form and the done/skipped ticks.
- No social features, coaches, sharing or team workspaces: single-tenant, one person, one plan.
- No multi-week periodization or long-term progression: the product plans one week at a time; history is a plain list at most.
- No native mobile app: responsive web only.
- No nutrition, sleep or body-metric tracking.
- No offline-first guarantee and no sub-second plan generation: generation may take several seconds.

## Open Questions

1. **Exact load limits per level and load points per intensity/duration** - Owner: author. By: start of implementation of the rule engine. Block: no (defaults will be proposed in the plan and can be tuned).

## Forward: tech-stack

- Plan generation is intended to use a hosted LLM via OpenRouter, returning structured data that the application validates. The rule engine (validation, load calculation, re-planning) is application code and must be unit-testable without the model.
- Hard deadline 2026-11-04; prefer a starter with built-in auth and database to minimise setup.

## Forward: technical-roadmap

- First vertical slice should be: auth + goal form + generate week + validation. Re-planning after skip is the second slice. CRUD edits of sessions third. History last.

## Quality cross-check

Access Control: present. Business Logic: present (one-sentence rule). Project artifacts: present. Timeline-cost ack: present (mvp_weeks 2, within budget). Non-Goals: present. Preserved behavior: n/a (greenfield).
