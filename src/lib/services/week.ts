import type { TypedSupabase } from "@/lib/supabase";
import type { Goal, Plan, Weekday, WeekValidation } from "@/types";
import { validateWeek } from "@/lib/services/rules";
import { getGoal } from "./goals";
import { getPlanForWeek, setPlanValid } from "./plans";
import { weekStartOf, weekdayOf } from "./mappers";

export interface WeekState {
  goal: Goal | null;
  plan: Plan | null;
  validation: WeekValidation | null;
  weekStart: string;
  today: Weekday;
}

/** Everything the week page needs for the current week. */
export async function loadWeek(supabase: TypedSupabase, userId: string, now = new Date()): Promise<WeekState> {
  const weekStart = weekStartOf(now);
  const today = weekdayOf(now);
  const goal = await getGoal(supabase, userId);
  if (!goal) return { goal: null, plan: null, validation: null, weekStart, today };
  const plan = await getPlanForWeek(supabase, userId, weekStart);
  const validation = plan ? validateWeek(plan.sessions, goal) : null;
  return { goal, plan, validation, weekStart, today };
}

/** Re-run validation on the stored plan and persist the verdict. */
export async function revalidate(supabase: TypedSupabase, userId: string, now = new Date()): Promise<WeekState> {
  const state = await loadWeek(supabase, userId, now);
  if (state.plan && state.validation && state.plan.valid !== state.validation.valid) {
    await setPlanValid(supabase, userId, state.plan.id, state.validation.valid);
    state.plan.valid = state.validation.valid;
  }
  return state;
}
