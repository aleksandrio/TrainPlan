import { describe, expect, it } from "vitest";
import { dayBefore, validateWeek } from "./validate";
import { goalUS01, session, volleyball } from "./fixtures";

describe("validateWeek: US-01 valid week", () => {
  it("accepts a week with push Tue, heavy legs Thu, cardio Fri, light Sat and volleyball Mon", () => {
    const week = [
      volleyball(),
      session({ day: 1, intensity: "moderate", muscleGroups: ["push", "core"] }),
      session({ day: 3, intensity: "heavy", muscleGroups: ["legs"], type: "plyometrics" }),
      session({ day: 4, intensity: "moderate", muscleGroups: ["cardio"], type: "cardio", durationMin: 40 }),
      session({ day: 5, intensity: "light", muscleGroups: ["core"], type: "mobility", durationMin: 30 }),
    ];
    const result = validateWeek(week, goalUS01);
    expect(result.violations).toEqual([]);
    expect(result.valid).toBe(true);
    expect(result.limit).toBe(24);
    expect(result.load).toBeLessThanOrEqual(24);
  });
});

describe("rule: 48 h regeneration", () => {
  it("flags two heavy sessions on the same muscle group on adjacent days (US-03)", () => {
    const week = [
      session({ day: 3, intensity: "heavy", muscleGroups: ["legs"] }),
      session({ day: 4, intensity: "heavy", muscleGroups: ["legs"] }),
    ];
    const result = validateWeek(week, { level: "advanced", fixedCommitment: null });
    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toMatchObject({ rule: "regeneration-48h", days: [3, 4] });
    expect(result.violations[0].message).toBe("48 h regeneration: legs (Thu heavy, Fri heavy)");
  });

  it("allows heavy sessions two days apart or on different muscle groups", () => {
    const week = [
      session({ day: 1, intensity: "heavy", muscleGroups: ["legs"] }),
      session({ day: 2, intensity: "heavy", muscleGroups: ["push"] }),
      session({ day: 3, intensity: "heavy", muscleGroups: ["legs"] }),
    ];
    expect(validateWeek(week, { level: "advanced", fixedCommitment: null }).violations).toEqual([]);
  });

  it("includes the locked team-sport session in the rule", () => {
    const week = [volleyball(), session({ day: 1, intensity: "heavy", muscleGroups: ["legs"] })];
    const result = validateWeek(week, { level: "advanced", fixedCommitment: null });
    expect(result.violations.map((v) => v.rule)).toEqual(["regeneration-48h"]);
  });

  it("ignores skipped sessions", () => {
    const week = [
      session({ day: 3, intensity: "heavy", muscleGroups: ["legs"], status: "skipped" }),
      session({ day: 4, intensity: "heavy", muscleGroups: ["legs"] }),
    ];
    expect(validateWeek(week, { level: "advanced", fixedCommitment: null }).valid).toBe(true);
  });
});

describe("rule: weekly load limit", () => {
  it("flags a week above the level limit", () => {
    const week = [
      session({ day: 1, intensity: "heavy", durationMin: 90 }),
      session({ day: 3, intensity: "heavy", durationMin: 90, muscleGroups: ["push"] }),
    ];
    const result = validateWeek(week, { level: "beginner", fixedCommitment: null });
    expect(result.load).toBe(18);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toMatchObject({ rule: "weekly-load" });
    expect(result.violations[0].message).toContain("exceeds the beginner limit of 16");
  });
});

describe("rule: light day before commitment", () => {
  it("wraps: a Monday commitment makes Sunday the light day", () => {
    expect(dayBefore(0)).toBe(6);
    expect(dayBefore(3)).toBe(2);
  });

  it("flags a moderate or heavy session the day before the commitment", () => {
    const week = [volleyball(), session({ day: 6, intensity: "moderate", muscleGroups: ["push"] })];
    const result = validateWeek(week, goalUS01);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toMatchObject({ rule: "light-before-commitment", days: [6, 0] });
    expect(result.violations[0].message).toContain("Sun must be light or rest before volleyball on Mon");
  });

  it("allows a light session or rest the day before", () => {
    const week = [volleyball(), session({ day: 6, intensity: "light", type: "mobility", muscleGroups: ["core"] })];
    expect(validateWeek(week, goalUS01).valid).toBe(true);
  });
});
