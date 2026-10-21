import { z } from "zod";
import { INTENSITIES, MUSCLE_GROUPS, SESSION_TYPES } from "@/types";

export const weekdaySchema = z.number().int().min(0).max(6);
export const levelSchema = z.enum(["beginner", "intermediate", "advanced"]);
export const intensitySchema = z.enum(INTENSITIES as [string, ...string[]]);
export const muscleGroupSchema = z.enum(MUSCLE_GROUPS as [string, ...string[]]);
export const sessionTypeSchema = z.enum(SESSION_TYPES as [string, ...string[]]);

export const goalInputSchema = z.object({
  goalText: z.string().trim().min(3, "Describe your goal in at least 3 characters").max(500),
  level: levelSchema,
  availableDays: z
    .array(weekdaySchema)
    .min(1, "Pick at least one training day")
    .max(7)
    .refine((days) => new Set(days).size === days.length, "Days must be unique"),
  fixedCommitment: z
    .object({
      day: weekdaySchema,
      label: z.string().trim().min(1, "Name the commitment").max(100),
    })
    .nullable(),
  notes: z.string().trim().max(1000).default(""),
});

export type GoalInputDto = z.infer<typeof goalInputSchema>;

/** A session as submitted by the user (add / edit). */
export const sessionInputSchema = z.object({
  day: weekdaySchema,
  type: sessionTypeSchema,
  muscleGroups: z.array(muscleGroupSchema).min(1, "Pick at least one muscle group").max(5),
  intensity: intensitySchema,
  durationMin: z.number().int().min(10).max(240),
  description: z.string().trim().max(1000).default(""),
});

export const sessionPatchSchema = z
  .object({
    day: weekdaySchema.optional(),
    type: sessionTypeSchema.optional(),
    muscleGroups: z.array(muscleGroupSchema).min(1, "Pick at least one muscle group").max(5).optional(),
    intensity: intensitySchema.optional(),
    durationMin: z.number().int().min(10).max(240).optional(),
    description: z.string().trim().max(1000).optional(),
    status: z.enum(["planned", "done", "skipped"]).optional(),
  })
  .refine((p) => Object.keys(p).length > 0, "Nothing to update");

/** Shape the LLM must return for a week draft. */
export const generatedSessionSchema = z.object({
  day: weekdaySchema,
  type: sessionTypeSchema,
  muscleGroups: z.array(muscleGroupSchema).min(1).max(5),
  intensity: intensitySchema,
  durationMin: z.number().int().min(10).max(240),
  description: z.string().max(1000),
});

export const generatedWeekSchema = z.object({
  sessions: z.array(generatedSessionSchema).max(7),
});

export const generateRequestSchema = z.object({
  keepDone: z.boolean().optional().default(true),
});

export const replanRequestSchema = z.object({
  sessionId: z.uuid(),
});

export function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
