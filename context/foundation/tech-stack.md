---
starter_id: 10x-astro-starter
package_manager: npm
project_name: trainplan
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: true
  has_background_jobs: false
---

## Why this stack

A solo developer shipping TrainPlan in 2 weeks of after-hours work with a hard deadline needs a starter that already covers email/password auth, a relational database with per-user isolation, server-side API routes for the plan-generation call and a cheap edge deployment with a public URL. 10x Astro Starter (Astro + React + TypeScript + Tailwind + Supabase + Cloudflare) is the recommended default for `(web, js)`, clears all four agent-friendly gates (typed, convention-based, popular, well documented) and its bootstrapper confidence is first-class, so scaffolding should be mostly smooth. Auth and AI feature flags are set (login per PRD FR-001/002; plan generation calls a hosted LLM through an API route and is validated by application code); payments, realtime and background jobs are out of scope per PRD non-goals. The one gotcha to watch: Supabase RLS must be configured in the first slice so the per-user isolation guardrail holds from day one. Alternatives considered: Next.js (verified, but Vercel-flavoured and heavier App Router), plain Astro (would require wiring auth and DB by hand, which the deadline does not allow). CI runs on GitHub Actions with auto-deploy-on-merge, as the starter ships.
