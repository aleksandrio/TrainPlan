import type { APIRoute } from "astro";
import { z } from "zod";
import { insertSession } from "@/lib/services/plans";
import { loadWeek, revalidate } from "@/lib/services/week";
import { json, jsonError, sessionInputSchema } from "@/lib/validation";
import type { SessionDraft } from "@/types";

export const prerender = false;

/** Add a manual session to the current week's plan. */
export const POST: APIRoute = async ({ locals, request }) => {
  const { supabase, user } = locals;
  if (!supabase || !user) return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }
  const parsed = sessionInputSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Validation failed", issues: z.flattenError(parsed.error) }, 400);

  const state = await loadWeek(supabase, user.id);
  if (!state.plan) return jsonError("Generate a week first", 400);

  const draft = {
    ...parsed.data,
    status: "planned",
    locked: false,
    source: "manual",
  } as SessionDraft;
  await insertSession(supabase, user.id, state.plan.id, draft);
  return json(await revalidate(supabase, user.id));
};
