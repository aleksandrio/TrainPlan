import type { TypedSupabase } from "@/lib/supabase";
import type { Plan, Session } from "@/types";
import type { SessionRow } from "@/db/database.types";
import { sessionFromRow, sessionToRow } from "./mappers";

export async function getPlanForWeek(supabase: TypedSupabase, userId: string, weekStart: string): Promise<Plan | null> {
  const { data: plan, error } = await supabase
    .from("plans")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) throw new Error(`getPlanForWeek: ${error.message}`);
  if (!plan) return null;
  const { data: rows, error: sErr } = await supabase
    .from("sessions")
    .select("*")
    .eq("plan_id", plan.id)
    .order("day", { ascending: true })
    .order("created_at", { ascending: true });
  if (sErr) throw new Error(`getPlanForWeek sessions: ${sErr.message}`);
  return {
    id: plan.id,
    goalId: plan.goal_id,
    weekStart: plan.week_start,
    valid: plan.valid,
    sessions: rows.map(sessionFromRow),
  };
}

export async function getPlanById(supabase: TypedSupabase, userId: string, planId: string): Promise<Plan | null> {
  const { data: plan, error } = await supabase
    .from("plans")
    .select("*")
    .eq("user_id", userId)
    .eq("id", planId)
    .maybeSingle();
  if (error) throw new Error(`getPlanById: ${error.message}`);
  if (!plan) return null;
  return getPlanForWeek(supabase, userId, plan.week_start);
}

/**
 * Replace the plan for a week: upsert the plan row, delete all its sessions and insert the given ones.
 * Used by generation and regeneration (callers pass done sessions back in to preserve them).
 */
export async function savePlan(
  supabase: TypedSupabase,
  userId: string,
  goalId: string,
  weekStart: string,
  sessions: Omit<Session, "id">[],
  valid: boolean,
): Promise<Plan> {
  const { data: plan, error } = await supabase
    .from("plans")
    .upsert({ user_id: userId, goal_id: goalId, week_start: weekStart, valid }, { onConflict: "user_id,week_start" })
    .select("*")
    .single();
  if (error) throw new Error(`savePlan: ${error.message}`);
  const { error: delErr } = await supabase.from("sessions").delete().eq("plan_id", plan.id);
  if (delErr) throw new Error(`savePlan delete: ${delErr.message}`);
  if (sessions.length > 0) {
    const { error: insErr } = await supabase
      .from("sessions")
      .insert(sessions.map((s) => sessionToRow(userId, plan.id, s)));
    if (insErr) throw new Error(`savePlan insert: ${insErr.message}`);
  }
  const saved = await getPlanForWeek(supabase, userId, weekStart);
  if (!saved) throw new Error("savePlan: plan vanished after save");
  return saved;
}

export async function setPlanValid(
  supabase: TypedSupabase,
  userId: string,
  planId: string,
  valid: boolean,
): Promise<void> {
  const { error } = await supabase.from("plans").update({ valid }).eq("id", planId).eq("user_id", userId);
  if (error) throw new Error(`setPlanValid: ${error.message}`);
}

export async function insertSession(
  supabase: TypedSupabase,
  userId: string,
  planId: string,
  session: Omit<Session, "id">,
): Promise<Session> {
  const { data, error } = await supabase
    .from("sessions")
    .insert(sessionToRow(userId, planId, session))
    .select("*")
    .single();
  if (error) throw new Error(`insertSession: ${error.message}`);
  return sessionFromRow(data);
}

export async function updateSession(
  supabase: TypedSupabase,
  userId: string,
  sessionId: string,
  patch: Partial<Omit<Session, "id">>,
): Promise<Session> {
  const row: Partial<SessionRow> = {};
  if (patch.day !== undefined) row.day = patch.day;
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.muscleGroups !== undefined) row.muscle_groups = patch.muscleGroups;
  if (patch.intensity !== undefined) row.intensity = patch.intensity;
  if (patch.durationMin !== undefined) row.duration_min = patch.durationMin;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.locked !== undefined) row.locked = patch.locked;
  if (patch.source !== undefined) row.source = patch.source;
  const { data, error } = await supabase
    .from("sessions")
    .update(row)
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw new Error(`updateSession: ${error.message}`);
  return sessionFromRow(data);
}

export async function deleteSession(supabase: TypedSupabase, userId: string, sessionId: string): Promise<void> {
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId).eq("user_id", userId);
  if (error) throw new Error(`deleteSession: ${error.message}`);
}

export async function listPlans(supabase: TypedSupabase, userId: string): Promise<Plan[]> {
  const { data: plans, error } = await supabase
    .from("plans")
    .select("*")
    .eq("user_id", userId)
    .order("week_start", { ascending: false });
  if (error) throw new Error(`listPlans: ${error.message}`);
  if (plans.length === 0) return [];
  const { data: rows, error: sErr } = await supabase
    .from("sessions")
    .select("*")
    .in(
      "plan_id",
      plans.map((p) => p.id),
    );
  if (sErr) throw new Error(`listPlans sessions: ${sErr.message}`);
  return plans.map((p) => ({
    id: p.id,
    goalId: p.goal_id,
    weekStart: p.week_start,
    valid: p.valid,
    sessions: rows.filter((r) => r.plan_id === p.id).map(sessionFromRow),
  }));
}
