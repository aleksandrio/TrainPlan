import { OPENROUTER_API_KEY, OPENROUTER_MODEL } from "astro:env/server";
import type { LlmConfig } from "@/lib/services/generation/openrouter";

export const DEFAULT_MODEL = "openai/gpt-4o-mini";

/** LLM configuration from server secrets, or null when generation should use the template planner. */
export function llmConfig(): LlmConfig | null {
  if (!OPENROUTER_API_KEY) return null;
  return { apiKey: OPENROUTER_API_KEY, model: OPENROUTER_MODEL ?? DEFAULT_MODEL, timeoutMs: 20_000 };
}
