import type { APIRoute } from "astro";
import { loadWeek } from "@/lib/services/week";
import { json, jsonError } from "@/lib/validation";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const { supabase, user } = locals;
  if (!supabase || !user) return jsonError("Unauthorized", 401);
  const state = await loadWeek(supabase, user.id);
  return json(state);
};
