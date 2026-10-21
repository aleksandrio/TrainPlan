import type { GoalInput, ReplanChange, ReplanProposal, Session, Weekday } from "@/types";
import { WEEKDAY_LABELS } from "@/types";
import { validateWeek } from "./validate";

const label = (d: Weekday) => WEEKDAY_LABELS[d];

/**
 * Propose a re-plan after `skippedSessionId` was skipped.
 * - done and locked sessions are never changed
 * - the skipped session's content is moved to the earliest available day after `today`
 *   that has no session and keeps the week valid; otherwise it is dropped with a reason
 */
export function replanAfterSkip(
  sessions: Session[],
  goal: Pick<GoalInput, "level" | "fixedCommitment" | "availableDays">,
  skippedSessionId: string,
  today: Weekday,
): ReplanProposal {
  const skipped = sessions.find((s) => s.id === skippedSessionId);
  if (!skipped) {
    return { sessions, changes: [], validation: validateWeek(sessions, goal) };
  }

  const base = sessions.map((s) => (s.id === skippedSessionId ? { ...s, status: "skipped" as const } : s));
  const changes: ReplanChange[] = [];

  if (skipped.locked) {
    const validation = validateWeek(base, goal);
    changes.push({
      sessionId: skipped.id,
      fromDay: skipped.day,
      toDay: null,
      action: "kept",
      reason: `${label(skipped.day)} session is a fixed commitment and is not re-planned`,
    });
    return { sessions: base, changes, validation };
  }

  const occupied = new Set(base.filter((s) => s.status !== "skipped").map((s) => s.day));
  const candidates = goal.availableDays
    .filter((d) => d > today && d !== skipped.day && !occupied.has(d))
    .sort((a, b) => a - b);

  let blockingReason: string | null = null;
  for (const day of candidates) {
    const moved: Session = { ...skipped, day, status: "planned", source: skipped.source };
    const trial = base.filter((s) => s.id !== skipped.id).concat(moved);
    const validation = validateWeek(trial, goal);
    if (validation.valid) {
      changes.push({
        sessionId: skipped.id,
        fromDay: skipped.day,
        toDay: day,
        action: "moved",
        reason: `${label(skipped.day)} ${skipped.intensity} ${skipped.muscleGroups.join("/")} session moved to ${label(day)}: first free day that keeps 48 h regeneration, the weekly load limit and a light day before the commitment`,
      });
      return { sessions: sortByDay(trial), changes, validation };
    }
    blockingReason ??= validation.violations[0]?.message ?? "rule violation";
  }

  const validation = validateWeek(base, goal);
  changes.push({
    sessionId: skipped.id,
    fromDay: skipped.day,
    toDay: null,
    action: "dropped",
    reason:
      candidates.length === 0
        ? `No free available day left after ${label(today)}; ${label(skipped.day)} session dropped for this week`
        : `No later day fits without breaking a rule (${blockingReason ?? "rule violation"}); ${label(skipped.day)} session dropped for this week`,
  });
  return { sessions: sortByDay(base), changes, validation };
}

export function sortByDay(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => a.day - b.day);
}
