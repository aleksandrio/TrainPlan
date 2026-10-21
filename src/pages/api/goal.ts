import type { APIRoute } from "astro";
import { z } from "zod";
import { getGoal, upsertGoal } from "@/lib/services/goals";
import { goalInputSchema, json, jsonError } from "@/lib/validation";
import type { GoalInput } from "@/types";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const { supabase, user } = locals;
  if (!supabase || !user) return jsonError("Unauthorized", 401);
  const goal = await getGoal(supabase, user.id);
  return json({ goal });
};

export const POST: APIRoute = async ({ locals, request }) => {
  const { supabase, user } = locals;
  if (!supabase || !user) return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }
  const parsed = goalInputSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Validation failed", issues: z.flattenError(parsed.error) }, 400);
  }
  const goal = await upsertGoal(supabase, user.id, parsed.data as GoalInput);
  return json({ goal });
};
