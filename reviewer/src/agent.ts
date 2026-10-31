// The reusable reviewer: an AI SDK ToolLoopAgent with REVIEW_SCHEMA as the only output contract.
// No tools by default (every tool call costs tokens); REVIEW_ALLOW_TOOLS=1 enables a read-only
// file lookup so the agent can peek at surrounding code when the diff is not enough.
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { Output, ToolLoopAgent, stepCountIs, tool, type LanguageModel } from "ai";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { REVIEW_INSTRUCTIONS } from "./prompts.js";
import { REVIEW_SCHEMA } from "./review-schema.js";

export const DEFAULT_MODEL = "deepseek/deepseek-v4.1-flash";

export interface ReviewerOptions {
  /** OpenRouter key; ignored when `model` is passed explicitly (tests, other providers). */
  apiKey?: string;
  /** OpenRouter model id, e.g. deepseek/deepseek-v4.1-flash */
  modelId?: string;
  /** Pre-built model (e.g. a mock in tests). */
  model?: LanguageModel;
  /** Repository root for the optional read-only file tool. Tools stay off when undefined. */
  repoRoot?: string;
  /** Max agent steps; 1 = single structured-output call, no tool loop. */
  maxSteps?: number;
}

const MAX_TOOL_FILE_CHARS = 12_000;

function fileTools(repoRoot: string) {
  const root = path.resolve(repoRoot);
  return {
    readRepoFile: tool({
      description:
        "Read a text file from the repository (read-only) to understand code around the diff. Returns at most 12k chars.",
      inputSchema: z.object({ filePath: z.string().describe("Path relative to the repository root") }),
      execute: async ({ filePath }) => {
        const resolved = path.resolve(root, filePath);
        if (!resolved.startsWith(root + path.sep)) return { error: "path outside repository" };
        try {
          const text = await readFile(resolved, "utf8");
          return { content: text.slice(0, MAX_TOOL_FILE_CHARS), truncated: text.length > MAX_TOOL_FILE_CHARS };
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),
  };
}

export function createOpenRouterModel(apiKey: string, modelId: string = DEFAULT_MODEL): LanguageModel {
  const openrouter = createOpenRouter({
    apiKey,
    extraBody: {
      // route to the cheapest provider that serves the model; fall back if it is down
      provider: { sort: "price", allow_fallbacks: true },
    },
  });
  return openrouter.chat(modelId, { usage: { include: true } });
}

export function createReviewer(options: ReviewerOptions = {}) {
  const model =
    options.model ??
    createOpenRouterModel(
      options.apiKey ?? requiredEnv("LLM_PROVIDER_API_KEY", "OPENROUTER_API_KEY"),
      options.modelId ?? process.env.REVIEW_MODEL ?? DEFAULT_MODEL,
    );
  const tools = options.repoRoot ? fileTools(options.repoRoot) : undefined;
  const maxSteps = options.maxSteps ?? (tools ? 4 : 1);

  return new ToolLoopAgent({
    model,
    instructions: REVIEW_INSTRUCTIONS,
    tools,
    stopWhen: stepCountIs(maxSteps),
    output: Output.object({ schema: REVIEW_SCHEMA }),
  });
}

export type Reviewer = ReturnType<typeof createReviewer>;

function requiredEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`Missing API key: set ${names.join(" or ")}`);
}
