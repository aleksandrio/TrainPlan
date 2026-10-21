import type { APIRoute } from "astro";
import { z } from "zod";
import { deleteSession, updateSession } from "@/lib/services/plans";
import { loadWeek, revalidate } from "@/lib/services/week";
import { json, jsonError, sessionPatchSchema } from "@/lib/validation";
import type { Session } from "@/types";

export const prerender = false;

const idSchema = z.uuid();

/** Edit a session or change its status. */
export const PATCH: APIRoute = async ({ locals, request, params }) => {
  const { supabase, user } = locals;
  if (!supabase || !user) return jsonError("Unauthorized", 401);
  const id = idSchema.safeParse(params.id);
  if (!id.success) return jsonError("Invalid session id");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }
  const parsed = sessionPatchSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Validation failed", issues: z.flattenError(parsed.error) }, 400);

  const state = await loadWeek(supabase, user.id);
  const existing = state.plan?.sessions.find((s) => s.id === id.data);
  if (!existing) return jsonError("Session not found", 404);
  if (existing.locked) {
    const { status, ...rest } = parsed.data;
    if (Object.keys(rest).length > 0) return jsonError("Fixed commitments can only change status", 400);
    if (status === undefined) return jsonError("Nothing to update", 400);
  }

  await updateSession(supabase, user.id, id.data, parsed.data as Partial<Omit<Session, "id">>);
  return json(await revalidate(supabase, user.id));
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  const { supabase, user } = locals;
  if (!supabase || !user) return jsonError("Unauthorized", 401);
  const id = idSchema.safeParse(params.id);
  if (!id.success) return jsonError("Invalid session id");

  const state = await loadWeek(supabase, user.id);
  const existing = state.plan?.sessions.find((s) => s.id === id.data);
  if (!existing) return jsonError("Session not found", 404);

  await deleteSession(supabase, user.id, id.data);
  return json(await revalidate(supabase, user.id));
};
