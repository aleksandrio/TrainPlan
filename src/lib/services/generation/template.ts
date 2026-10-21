import type { GoalInput, Intensity, MuscleGroup, SessionDraft, SessionType, Weekday } from "@/types";
import { dayBefore, validateWeek } from "@/lib/services/rules";

export type DraftSession = SessionDraft;

interface Slot {
  type: SessionType;
  muscleGroups: MuscleGroup[];
  intensity: Intensity;
  durationMin: number;
  description: string;
}

const LIGHT_MOBILITY: Slot = {
  type: "mobility",
  muscleGroups: ["core"],
  intensity: "light",
  durationMin: 30,
  description:
    "Mobility and core: hips, ankles, thoracic spine, light core circuit. Easy day before your fixed activity.",
};

/** Rotation of session templates, heaviest first so trimming keeps the emphasis. */
const ROTATION: Slot[] = [
  {
    type: "plyometrics",
    muscleGroups: ["legs"],
    intensity: "heavy",
    durationMin: 60,
    description:
      "Lower body power: squats or trap-bar deadlifts 4x5, box jumps 4x5, split squats 3x8, calf raises 3x12.",
  },
  {
    type: "strength",
    muscleGroups: ["push", "core"],
    intensity: "moderate",
    durationMin: 60,
    description: "Upper push + core: bench press 4x6, overhead press 3x8, dips 3x10, plank series.",
  },
  {
    type: "cardio",
    muscleGroups: ["cardio"],
    intensity: "moderate",
    durationMin: 40,
    description: "Conditioning: 10 min easy, 6x2 min hard / 2 min easy, 10 min easy.",
  },
  {
    type: "strength",
    muscleGroups: ["pull", "core"],
    intensity: "moderate",
    durationMin: 60,
    description: "Upper pull + core: pull-ups 4x6, rows 4x8, face pulls 3x15, hanging knee raises 3x12.",
  },
  {
    type: "strength",
    muscleGroups: ["legs"],
    intensity: "moderate",
    durationMin: 45,
    description: "Legs, technique focus: goblet squats 3x10, Romanian deadlifts 3x10, lunges 3x10 per side.",
  },
  {
    type: "cardio",
    muscleGroups: ["cardio"],
    intensity: "light",
    durationMin: 30,
    description: "Easy aerobic run or bike, conversational pace.",
  },
  LIGHT_MOBILITY,
];

function makeSession(day: Weekday, slot: Slot): DraftSession {
  return { ...slot, day, status: "planned", locked: false, source: "generated" };
}

const LOWER: Record<Intensity, Intensity | null> = { heavy: "moderate", moderate: "light", light: null };

/**
 * Deterministic planner: always returns a rule-valid week for the goal.
 * `locked` sessions (the fixed commitment) are included in the result untouched.
 */
export function templateWeek(goal: GoalInput, locked: DraftSession[] = []): DraftSession[] {
  const lockedDays = new Set(locked.map((s) => s.day));
  const days = [...goal.availableDays].filter((d) => !lockedDays.has(d)).sort((a, b) => a - b);
  const eve = goal.fixedCommitment ? dayBefore(goal.fixedCommitment.day) : null;

  const sessions: DraftSession[] = [];
  let rotationIndex = 0;

  for (const day of days) {
    if (day === eve) {
      sessions.push(makeSession(day, LIGHT_MOBILITY));
      continue;
    }
    // pick the next slot that does not create a 48 h conflict with what is already placed
    let placed = false;
    for (let attempt = 0; attempt < ROTATION.length && !placed; attempt++) {
      const slot = ROTATION[(rotationIndex + attempt) % ROTATION.length];
      const candidate = makeSession(day, slot);
      const trial = [...locked, ...sessions, candidate];
      const { violations } = validateWeek(trial, { level: "advanced", fixedCommitment: goal.fixedCommitment });
      if (violations.every((v) => v.rule === "weekly-load")) {
        sessions.push(candidate);
        rotationIndex = (rotationIndex + attempt + 1) % ROTATION.length;
        placed = true;
      }
    }
    if (!placed) sessions.push(makeSession(day, LIGHT_MOBILITY));
  }

  // Trim until the weekly load fits the level: lower intensity first, then shorten, from the last placed session.
  let guard = 0;
  while (validateWeek([...locked, ...sessions], goal).violations.some((v) => v.rule === "weekly-load") && guard < 100) {
    guard++;
    const idx = [...sessions.keys()].reverse().find((i) => LOWER[sessions[i].intensity] !== null);
    if (idx !== undefined) {
      const lower = LOWER[sessions[idx].intensity];
      if (lower) {
        sessions[idx] = {
          ...sessions[idx],
          intensity: lower,
          description: `${sessions[idx].description} (reduced to ${lower} to fit your weekly load)`,
        };
        continue;
      }
    }
    const longIdx = [...sessions.keys()].reverse().find((i) => sessions[i].durationMin > 30);
    if (longIdx === undefined) break;
    sessions[longIdx] = { ...sessions[longIdx], durationMin: 30 };
  }

  return [...locked, ...sessions].sort((a, b) => a.day - b.day);
}

/** The fixed commitment as a locked session. */
export function commitmentSession(goal: GoalInput): DraftSession | null {
  if (!goal.fixedCommitment) return null;
  return {
    day: goal.fixedCommitment.day,
    type: "team_sport",
    muscleGroups: ["legs", "cardio"],
    intensity: "heavy",
    durationMin: 90,
    description: goal.fixedCommitment.label,
    status: "planned",
    locked: true,
    source: "commitment",
  };
}
