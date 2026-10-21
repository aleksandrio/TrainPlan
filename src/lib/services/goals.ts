import type { TypedSupabase } from "@/lib/supabase";
import type { Goal, GoalInput } from "@/types";
import { goalFromRow, goalToRow } from "./mappers";

export async function getGoal(supabase: TypedSupabase, userId: string): Promise<Goal | null> {
  const { data, error } = await supabase.from("goals").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`getGoal: ${error.message}`);
  return data ? goalFromRow(data) : null;
}

export async function upsertGoal(supabase: TypedSupabase, userId: string, input: GoalInput): Promise<Goal> {
  const { data, error } = await supabase
    .from("goals")
    .upsert(goalToRow(userId, input), { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw new Error(`upsertGoal: ${error.message}`);
  return goalFromRow(data);
}
