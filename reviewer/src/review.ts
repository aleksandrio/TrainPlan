// Run one review: build the prompt, call the agent, validate the output against the schema.
import { createReviewer, type ReviewerOptions } from "./agent.js";
import { buildReviewPrompt, DEFAULT_DIFF_MAX_CHARS, type ReviewInput } from "./prompts.js";
import { REVIEW_SCHEMA, SCORE_KEYS, type Review } from "./review-schema.js";

export interface ReviewRunOptions extends ReviewerOptions {
  diffMaxChars?: number;
}

export interface ReviewUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  /** USD, reported by OpenRouter when usage accounting is on */
  cost?: number;
  steps: number;
}

export interface ReviewResult {
  review: Review;
  usage: ReviewUsage;
  diffTruncated: boolean;
}

export async function reviewDiff(input: ReviewInput, options: ReviewRunOptions = {}): Promise<ReviewResult> {
  const { prompt, diff } = buildReviewPrompt(input, options.diffMaxChars ?? envInt("DIFF_MAX_CHARS") ?? DEFAULT_DIFF_MAX_CHARS);
  const reviewer = createReviewer(options);

  let usage: ReviewUsage = { steps: 0 };
  const result = await reviewer.generate({
    prompt,
    onEnd({ usage: u, steps }) {
      usage = { inputTokens: u.inputTokens, outputTokens: u.outputTokens, totalTokens: u.totalTokens, steps: steps.length };
    },
  });

  const cost = readCost(result.providerMetadata);
  if (cost !== undefined) usage.cost = cost;

  const review = normalize(REVIEW_SCHEMA.parse(result.output));
  return { review, usage, diffTruncated: diff.truncated };
}

/** Clamp scores into 1-10 and round them; the schema cannot enforce the range for every provider. */
export function normalize(review: Review): Review {
  const out = { ...review };
  for (const key of SCORE_KEYS) {
    const n = Number(out[key]);
    out[key] = Number.isFinite(n) ? Math.min(10, Math.max(1, Math.round(n))) : 1;
  }
  return out;
}

function readCost(meta: unknown): number | undefined {
  if (!meta || typeof meta !== "object") return undefined;
  const or = (meta as Record<string, unknown>).openrouter;
  if (!or || typeof or !== "object") return undefined;
  const usage = (or as Record<string, unknown>).usage;
  if (!usage || typeof usage !== "object") return undefined;
  const cost = (usage as Record<string, unknown>).cost;
  return typeof cost === "number" ? cost : undefined;
}

function envInt(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
