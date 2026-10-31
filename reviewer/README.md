# TrainPlan AI reviewer

Code review agent for pull requests, built for the 10xDevs M5L2/M5L3 project. An [AI SDK](https://ai-sdk.dev) `ToolLoopAgent` reads the PR title, description and diff, scores six criteria (1-10) and returns a binding `pass`/`fail` verdict plus a Markdown summary. The contract lives in `src/review-schema.ts`; the composite action `.github/actions/ai-reviewer` and the workflow `.github/workflows/review.yml` turn that verdict into a PR comment, a label (`ai-cr:passed` / `ai-cr:failed`) and a failing check.

Models go through OpenRouter. The default is `deepseek/deepseek-v4.1-flash` with `provider.sort = price` routing, which is among the cheapest models that handle structured output; a typical PR review costs a fraction of a cent. `DIFF_MAX_CHARS` (default 120k chars) truncates oversized diffs before they reach the model.

## Layout

- `src/review-schema.ts` - zod schema + system prompt (the single contract)
- `src/prompts.ts` - review instructions and prompt builder (diff truncation)
- `src/agent.ts` - `createReviewer()` (ToolLoopAgent, optional read-only `readRepoFile` tool)
- `src/review.ts` - `reviewDiff()` with usage/cost reporting
- `src/format.ts` - Markdown for the PR comment
- `src/cli.ts` - entry point bundled to `dist/review.js`
- `prompts/`, `fixtures/`, `promptfooconfig.yaml` - evals across models
- `test/` - unit tests with a mocked model (no network)

## Local usage

```bash
cd reviewer
npm ci && npm run build
cp .env.example .env   # set LLM_PROVIDER_API_KEY (OpenRouter)
export $(grep -v '^#' .env | xargs)

# review any diff
git diff main...HEAD > /tmp/pr.diff
DIFF_FILE=/tmp/pr.diff PR_TITLE="feat: ..." node dist/review.js --markdown /tmp/comment.md

# or the bundled sample
DIFF_FILE=fixtures/sample-feature.diff PR_TITLE="feat: week stats" npm run review
```

Flags/env: `REVIEW_MODEL` (OpenRouter id), `DIFF_MAX_CHARS`, `--markdown <file>`, `--repo-root <dir>` or `REVIEW_ALLOW_TOOLS=1` to let the agent read files around the diff (more tokens, up to 4 steps).

## CI

`review.yml` runs on every PR to `main` (and again when the `ai-cr:review` label is added). It needs one repository secret: `LLM_PROVIDER_API_KEY` (OpenRouter key). Make the `review` check required in branch protection to turn the verdict into a merge gate.

## Evals (promptfoo)

```bash
OPENROUTER_API_KEY=... npm run eval && npm run eval:view
```

`promptfooconfig.yaml` runs the same prompt on three cheap models (`deepseek/deepseek-v4.1-flash`, `z-ai/glm-5.3-flash`, `qwen/qwen3.7-flash`) over three diffs: a React 16 -> 19 migration with three planted flaws (must `fail`, LLM-rubric checks all three are named), a SQL injection (must `fail` with `securitySafety <= 3`) and a small clean change with a test (must `pass`). Use the pass/fail matrix plus cost and latency to pick the model for CI, and keep it as a regression gate when the prompt changes.

## Tests

```bash
npm test          # vitest, mocked model
npm run typecheck
```
