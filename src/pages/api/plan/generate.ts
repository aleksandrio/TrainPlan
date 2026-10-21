import type { APIRoute } from "astro";
import { generateWeek } from "@/lib/services/generation";
import { savePlan } from "@/lib/services/plans";
import { loadWeek } from "@/lib/services/week";
import { llmConfig } from "@/lib/llm-config";
import { generateRequestSchema, json, jsonError } from "@/lib/validation";

export const prerender = false;

/** Generate (or regenerate) the current week's plan from the user's goal. */
export const POST: APIRoute = async ({ locals, request }) => {
  const { supabase, user } = locals;
  if (!supabase || !user) return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    const text = await request.text();
    body = text ? (JSON.parse(text) as unknown) : {};
  } catch {
    return jsonError("Invalid JSON body");
  }
  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError("Validation failed");

  const state = await loadWeek(supabase, user.id);
  if (!state.goal) return jsonError("Save your goal first", 400);

  const keep = parsed.data.keepDone && state.plan ? state.plan.sessions.filter((s) => s.status === "done") : [];

  try {
    const result = await generateWeek(state.goal, { llm: llmConfig(), keep });
    const plan = await savePlan(
      supabase,
      user.id,
      state.goal.id,
      state.weekStart,
      result.sessions,
      result.validation.valid,
    );
    return json({ plan, validation: result.validation, source: result.source, note: result.note, today: state.today });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return jsonError(message, 500);
  }
};
