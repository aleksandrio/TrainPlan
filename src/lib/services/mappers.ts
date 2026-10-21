import type { GoalRow, SessionRow } from "@/db/database.types";
import type {
  Goal,
  GoalInput,
  Intensity,
  Level,
  MuscleGroup,
  Session,
  SessionSource,
  SessionStatus,
  SessionType,
  Weekday,
} from "@/types";

export function toWeekday(n: number): Weekday {
  if (n < 0 || n > 6 || !Number.isInteger(n)) throw new Error(`Invalid weekday: ${n}`);
  return n as Weekday;
}

export function goalFromRow(row: GoalRow): Goal {
  return {
    id: row.id,
    goalText: row.goal_text,
    level: row.level as Level,
    availableDays: row.available_days.map(toWeekday),
    fixedCommitment:
      row.fixed_commitment_day === null || row.fixed_commitment_label === null
        ? null
        : { day: toWeekday(row.fixed_commitment_day), label: row.fixed_commitment_label },
    notes: row.notes,
  };
}

export function goalToRow(userId: string, input: GoalInput) {
  return {
    user_id: userId,
    goal_text: input.goalText,
    level: input.level,
    available_days: [...input.availableDays].sort((a, b) => a - b),
    fixed_commitment_day: input.fixedCommitment?.day ?? null,
    fixed_commitment_label: input.fixedCommitment?.label ?? null,
    notes: input.notes,
  };
}

export function sessionFromRow(row: SessionRow): Session {
  return {
    id: row.id,
    day: toWeekday(row.day),
    type: row.type as SessionType,
    muscleGroups: row.muscle_groups as MuscleGroup[],
    intensity: row.intensity as Intensity,
    durationMin: row.duration_min,
    description: row.description,
    status: row.status as SessionStatus,
    locked: row.locked,
    source: row.source as SessionSource,
  };
}

export function sessionToRow(userId: string, planId: string, s: Omit<Session, "id">) {
  return {
    plan_id: planId,
    user_id: userId,
    day: s.day,
    type: s.type,
    muscle_groups: s.muscleGroups,
    intensity: s.intensity,
    duration_min: s.durationMin,
    description: s.description,
    status: s.status,
    locked: s.locked,
    source: s.source,
  };
}

/** ISO date (YYYY-MM-DD) of the Monday of the week containing `date` (UTC). */
export function weekStartOf(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

/** Weekday (0 = Monday) of `date` (UTC). */
export function weekdayOf(date: Date): Weekday {
  return toWeekday((date.getUTCDay() + 6) % 7);
}
