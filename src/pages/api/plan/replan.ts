import type { APIRoute } from "astro";
import { replanAfterSkip } from "@/lib/services/rules";
import { updateSession, setPlanValid } from "@/lib/services/plans";
import { loadWeek } from "@/lib/services/week";
import { json, jsonError, replanRequestSchema } from "@/lib/validation";

export const prerender = false;

async function parseBody(request: Request) {
  try {
    return replanRequestSchema.safeParse(await request.json());
  } catch {
    return null;
  }
}

/** Propose a re-plan after skipping a session (nothing is persisted). */
export const POST: APIRoute = async ({ locals, request }) => {
  const { supabase, user } = locals;
  if (!supabase || !user) return jsonError("Unauthorized", 401);
  const parsed = await parseBody(request);
  if (!parsed?.success) return jsonError("Invalid request");

  const state = await loadWeek(supabase, user.id);
  if (!state.goal || !state.plan) return jsonError("No plan for this week", 404);
  if (!state.plan.sessions.some((s) => s.id === parsed.data.sessionId)) return jsonError("Session not found", 404);

  const proposal = replanAfterSkip(state.plan.sessions, state.goal, parsed.data.sessionId, state.today);
  return json({ proposal });
};

/** Apply the re-plan: mark the session skipped and persist the moved session (if any). */
export const PUT: APIRoute = async ({ locals, request }) => {
  const { supabase, user } = locals;
  if (!supabase || !user) return jsonError("Unauthorized", 401);
  const parsed = await parseBody(request);
  if (!parsed?.success) return jsonError("Invalid request");

  const state = await loadWeek(supabase, user.id);
  if (!state.goal || !state.plan) return jsonError("No plan for this week", 404);
  const skipped = state.plan.sessions.find((s) => s.id === parsed.data.sessionId);
  if (!skipped) return jsonError("Session not found", 404);

  const proposal = replanAfterSkip(state.plan.sessions, state.goal, skipped.id, state.today);
  for (const change of proposal.changes) {
    if (change.action === "moved" && change.toDay !== null) {
      await updateSession(supabase, user.id, change.sessionId, { day: change.toDay, status: "planned" });
    } else if (change.action === "dropped") {
      await updateSession(supabase, user.id, change.sessionId, { status: "skipped" });
    } else if (change.action === "kept") {
      await updateSession(supabase, user.id, change.sessionId, { status: "skipped" });
    }
  }
  await setPlanValid(supabase, user.id, state.plan.id, proposal.validation.valid);
  const fresh = await loadWeek(supabase, user.id);
  return json({ ...fresh, changes: proposal.changes });
};
