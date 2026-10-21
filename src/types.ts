// Shared domain types for TrainPlan. Entities and DTOs used by the rule engine,
// API routes and UI. Keep this file free of framework imports.

export type Level = "beginner" | "intermediate" | "advanced";

/** 0 = Monday ... 6 = Sunday */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type MuscleGroup = "legs" | "push" | "pull" | "core" | "cardio";
export const MUSCLE_GROUPS: MuscleGroup[] = ["legs", "push", "pull", "core", "cardio"];

export type Intensity = "light" | "moderate" | "heavy";
export const INTENSITIES: Intensity[] = ["light", "moderate", "heavy"];

export type SessionType = "strength" | "cardio" | "mobility" | "plyometrics" | "team_sport" | "other";
export const SESSION_TYPES: SessionType[] = ["strength", "cardio", "mobility", "plyometrics", "team_sport", "other"];

export type SessionStatus = "planned" | "done" | "skipped";

export type SessionSource = "generated" | "manual" | "commitment";

export interface Session {
  id: string;
  day: Weekday;
  type: SessionType;
  muscleGroups: MuscleGroup[];
  intensity: Intensity;
  durationMin: number;
  description: string;
  status: SessionStatus;
  /** Locked sessions (fixed commitments) are never moved or regenerated. */
  locked: boolean;
  source: SessionSource;
}

export interface FixedCommitment {
  day: Weekday;
  label: string;
}

export interface GoalInput {
  goalText: string;
  level: Level;
  availableDays: Weekday[];
  fixedCommitment: FixedCommitment | null;
  notes: string;
}

export interface Goal extends GoalInput {
  id: string;
}

export type RuleId = "regeneration-48h" | "weekly-load" | "light-before-commitment";

export interface Violation {
  rule: RuleId;
  days: Weekday[];
  message: string;
}

export interface WeekValidation {
  valid: boolean;
  load: number;
  limit: number;
  violations: Violation[];
}

export type ReplanAction = "moved" | "dropped" | "kept";

export interface ReplanChange {
  sessionId: string;
  fromDay: Weekday;
  toDay: Weekday | null;
  action: ReplanAction;
  reason: string;
}

export interface ReplanProposal {
  sessions: Session[];
  changes: ReplanChange[];
  validation: WeekValidation;
}

export interface Plan {
  id: string;
  goalId: string;
  /** ISO date (YYYY-MM-DD) of the Monday starting the week */
  weekStart: string;
  valid: boolean;
  sessions: Session[];
}
