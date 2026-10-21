import type { GoalInput, Session } from "@/types";

let counter = 0;

export function session(overrides: Partial<Session> & Pick<Session, "day">): Session {
  counter += 1;
  return {
    id: `s${counter}`,
    type: "strength",
    muscleGroups: ["legs"],
    intensity: "moderate",
    durationMin: 60,
    description: "",
    status: "planned",
    locked: false,
    source: "generated",
    ...overrides,
  };
}

/** US-01 goal: intermediate, Tue/Thu/Fri/Sat available, volleyball on Monday. */
export const goalUS01: GoalInput = {
  goalText: "conditioning and vertical jump for Monday volleyball",
  level: "intermediate",
  availableDays: [1, 3, 4, 5],
  fixedCommitment: { day: 0, label: "volleyball" },
  notes: "",
};

export const volleyball = (): Session =>
  session({
    id: "commitment",
    day: 0,
    type: "team_sport",
    muscleGroups: ["legs", "cardio"],
    intensity: "heavy",
    durationMin: 90,
    description: "Volleyball",
    locked: true,
    source: "commitment",
  });
