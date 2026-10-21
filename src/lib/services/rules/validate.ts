import type { GoalInput, MuscleGroup, SessionDraft, Violation, Weekday, WeekValidation } from "@/types";
import { WEEKDAY_LABELS } from "@/types";
import { weekLoad, weeklyLimit } from "./load";

const label = (d: Weekday) => WEEKDAY_LABELS[d];

/** The day before a weekday, wrapping Sunday -> Monday. */
export function dayBefore(day: Weekday): Weekday {
  return ((day + 6) % 7) as Weekday;
}

function activeSessions<T extends SessionDraft>(sessions: T[]): T[] {
  return sessions.filter((s) => s.status !== "skipped");
}

/** Rule 1: two heavy sessions sharing a muscle group may not be on the same or adjacent days. */
export function regenerationViolations(sessions: SessionDraft[]): Violation[] {
  const heavy = activeSessions(sessions).filter((s) => s.intensity === "heavy");
  const violations: Violation[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < heavy.length; i++) {
    for (let j = i + 1; j < heavy.length; j++) {
      const a = heavy[i];
      const b = heavy[j];
      if (Math.abs(a.day - b.day) > 1) continue;
      const shared = a.muscleGroups.filter((g) => b.muscleGroups.includes(g));
      for (const group of shared) {
        const days = [a.day, b.day].sort((x, y) => x - y);
        const key = `${group}:${days.join("-")}`;
        if (seen.has(key)) continue;
        seen.add(key);
        violations.push({
          rule: "regeneration-48h",
          days,
          message: `48 h regeneration: ${describeGroup(group)} (${label(days[0])} heavy, ${label(days[1])} heavy)`,
        });
      }
    }
  }
  return violations;
}

/** Rule 2: total weekly load must not exceed the limit for the level. */
export function loadViolations(sessions: SessionDraft[], goal: Pick<GoalInput, "level">): Violation[] {
  const load = weekLoad(sessions);
  const limit = weeklyLimit(goal.level);
  if (load <= limit) return [];
  return [
    {
      rule: "weekly-load",
      days: activeSessions(sessions).map((s) => s.day),
      message: `Weekly load ${load} exceeds the ${goal.level} limit of ${limit}`,
    },
  ];
}

/** Rule 3: the day before the fixed commitment must be light or rest. */
export function commitmentViolations(sessions: SessionDraft[], goal: Pick<GoalInput, "fixedCommitment">): Violation[] {
  const commitment = goal.fixedCommitment;
  if (!commitment) return [];
  const eve = dayBefore(commitment.day);
  const offenders = activeSessions(sessions).filter((s) => s.day === eve && s.intensity !== "light");
  return offenders.map((s) => ({
    rule: "light-before-commitment",
    days: [eve, commitment.day],
    message: `${label(eve)} must be light or rest before ${commitment.label} on ${label(commitment.day)} (${s.intensity} session planned)`,
  }));
}

export function validateWeek(
  sessions: SessionDraft[],
  goal: Pick<GoalInput, "level" | "fixedCommitment">,
): WeekValidation {
  const violations = [
    ...regenerationViolations(sessions),
    ...loadViolations(sessions, goal),
    ...commitmentViolations(sessions, goal),
  ];
  return {
    valid: violations.length === 0,
    load: weekLoad(sessions),
    limit: weeklyLimit(goal.level),
    violations,
  };
}

function describeGroup(group: MuscleGroup): string {
  return group;
}
