import { describe, expect, it } from "vitest";
import { sessionLoad, weekLoad, weeklyLimit } from "./load";
import { session } from "./fixtures";

describe("sessionLoad", () => {
  it("scales with intensity per 30-minute block", () => {
    expect(sessionLoad(session({ day: 1, intensity: "light", durationMin: 30 }))).toBe(1);
    expect(sessionLoad(session({ day: 1, intensity: "moderate", durationMin: 60 }))).toBe(4);
    expect(sessionLoad(session({ day: 1, intensity: "heavy", durationMin: 60 }))).toBe(6);
  });

  it("rounds partial blocks up and never below one block", () => {
    expect(sessionLoad(session({ day: 1, intensity: "heavy", durationMin: 45 }))).toBe(6);
    expect(sessionLoad(session({ day: 1, intensity: "light", durationMin: 10 }))).toBe(1);
  });

  it("counts skipped sessions as zero", () => {
    expect(sessionLoad(session({ day: 1, intensity: "heavy", status: "skipped" }))).toBe(0);
  });
});

describe("weeklyLimit / weekLoad", () => {
  it("has increasing limits per level", () => {
    expect(weeklyLimit("beginner")).toBeLessThan(weeklyLimit("intermediate"));
    expect(weeklyLimit("intermediate")).toBeLessThan(weeklyLimit("advanced"));
  });

  it("sums the week ignoring skipped sessions", () => {
    const week = [
      session({ day: 1, intensity: "heavy", durationMin: 60 }),
      session({ day: 3, intensity: "light", durationMin: 30 }),
      session({ day: 5, intensity: "heavy", durationMin: 60, status: "skipped" }),
    ];
    expect(weekLoad(week)).toBe(7);
  });
});
