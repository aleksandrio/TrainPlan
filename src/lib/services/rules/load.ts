import type { Intensity, Level, Session } from "@/types";

/** Load points per 30-minute block, by intensity. */
export const INTENSITY_FACTOR: Record<Intensity, number> = {
  light: 1,
  moderate: 2,
  heavy: 3,
};

/** Maximum weekly load points per level. */
export const WEEKLY_LIMIT: Record<Level, number> = {
  beginner: 16,
  intermediate: 24,
  advanced: 32,
};

/** Load of one session: ceil(duration / 30) * intensity factor. Skipped sessions count 0. */
export function sessionLoad(session: Pick<Session, "intensity" | "durationMin" | "status">): number {
  if (session.status === "skipped") return 0;
  const blocks = Math.max(1, Math.ceil(session.durationMin / 30));
  return blocks * INTENSITY_FACTOR[session.intensity];
}

export function weeklyLimit(level: Level): number {
  return WEEKLY_LIMIT[level];
}

export function weekLoad(sessions: Pick<Session, "intensity" | "durationMin" | "status">[]): number {
  return sessions.reduce((sum, s) => sum + sessionLoad(s), 0);
}
