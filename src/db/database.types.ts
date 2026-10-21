// Hand-written Supabase Database type mirroring supabase/migrations/20261021120000_init_trainplan.sql.
// Regenerate with `npx supabase gen types typescript --linked > src/db/database.types.ts` once a project is linked.

/* eslint-disable @typescript-eslint/consistent-type-definitions -- supabase-js needs index-signature-compatible type aliases */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type GoalRow = {
  id: string;
  user_id: string;
  goal_text: string;
  level: string;
  available_days: number[];
  fixed_commitment_day: number | null;
  fixed_commitment_label: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type PlanRow = {
  id: string;
  user_id: string;
  goal_id: string;
  week_start: string;
  valid: boolean;
  generation_count: number;
  generation_day: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionRow = {
  id: string;
  plan_id: string;
  user_id: string;
  day: number;
  type: string;
  muscle_groups: string[];
  intensity: string;
  duration_min: number;
  description: string;
  status: string;
  locked: boolean;
  source: string;
  created_at: string;
  updated_at: string;
};

type Insert<Row, Optional extends keyof Row> = Omit<Row, Optional> & Partial<Pick<Row, Optional>>;

export type Database = {
  public: {
    Tables: {
      goals: {
        Row: GoalRow;
        Insert: Insert<
          GoalRow,
          "id" | "created_at" | "updated_at" | "notes" | "fixed_commitment_day" | "fixed_commitment_label"
        >;
        Update: Partial<GoalRow>;
        Relationships: [];
      };
      plans: {
        Row: PlanRow;
        Insert: Insert<PlanRow, "id" | "created_at" | "updated_at" | "valid" | "generation_count" | "generation_day">;
        Update: Partial<PlanRow>;
        Relationships: [];
      };
      sessions: {
        Row: SessionRow;
        Insert: Insert<SessionRow, "id" | "created_at" | "updated_at" | "status" | "locked" | "source" | "description">;
        Update: Partial<SessionRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
