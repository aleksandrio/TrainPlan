import { describe, expect, it } from "vitest";
import { validateWeek } from "@/lib/services/rules";
import type { GoalInput, Level, Weekday } from "@/types";
import { commitmentSession, templateWeek } from "./template";
import { generateWeek } from "./index";

const base: GoalInput = {
  goalText: "conditioning and jump",
  level: "intermediate",
  availableDays: [1, 3, 4, 5],
  fixedCommitment: { day: 0, label: "volleyball" },
  notes: "",
};

function lockedFor(goal: GoalInput) {
  const c = commitmentSession(goal);
  return c ? [c] : [];
}

describe("templateWeek", () => {
  it("fills every available day and keeps the week valid (US-01)", () => {
    const week = templateWeek(base, lockedFor(base));
    const planned = week.filter((s) => !s.locked);
    expect(planned.map((s) => s.day)).toEqual([1, 3, 4, 5]);
    expect(validateWeek(week, base).valid).toBe(true);
    expect(week.find((s) => s.locked)?.day).toBe(0);
  });

  it("puts a light session on the day before the commitment when that day is available", () => {
    const goal: GoalInput = { ...base, availableDays: [2, 4, 6] };
    const week = templateWeek(goal, lockedFor(goal));
    expect(week.find((s) => s.day === 6)?.intensity).toBe("light");
    expect(validateWeek(week, goal).valid).toBe(true);
  });

  it("stays valid for every level, with and without a commitment, for 1 to 7 days", () => {
    const levels: Level[] = ["beginner", "intermediate", "advanced"];
    for (const level of levels) {
      for (let n = 1; n <= 7; n++) {
        const days = Array.from({ length: n }, (_, i) => i as Weekday);
        for (const commitment of [null, { day: 0 as Weekday, label: "match" }, { day: 3 as Weekday, label: "match" }]) {
          const goal: GoalInput = { ...base, level, availableDays: days, fixedCommitment: commitment };
          const week = templateWeek(goal, lockedFor(goal));
          const result = validateWeek(week, goal);
          expect(result.violations, `${level} ${n} days ${JSON.stringify(commitment)}`).toEqual([]);
        }
      }
    }
  });
});

describe("generateWeek without an LLM", () => {
  it("returns a valid template week and includes the commitment", async () => {
    const result = await generateWeek(base);
    expect(result.source).toBe("template");
    expect(result.validation.valid).toBe(true);
    expect(result.sessions.some((s) => s.source === "commitment")).toBe(true);
  });

  it("keeps done sessions untouched and does not plan their days", async () => {
    const done = {
      day: 1 as Weekday,
      type: "strength" as const,
      muscleGroups: ["push" as const],
      intensity: "moderate" as const,
      durationMin: 60,
      description: "done already",
      status: "done" as const,
      locked: false,
      source: "generated" as const,
    };
    const result = await generateWeek(base, { keep: [done] });
    const tue = result.sessions.filter((s) => s.day === 1);
    expect(tue).toHaveLength(1);
    expect(tue[0]).toMatchObject({ status: "done", description: "done already" });
    expect(result.validation.valid).toBe(true);
  });

  it("falls back to the template when the LLM fails", async () => {
    const failingFetch = (() => Promise.reject(new Error("network down"))) as unknown as typeof fetch;
    const result = await generateWeek(base, { llm: { apiKey: "x", model: "m", fetchImpl: failingFetch } });
    expect(result.source).toBe("template");
    expect(result.note).toContain("template week was used");
    expect(result.validation.valid).toBe(true);
  });

  it("uses the LLM draft when it is valid", async () => {
    const draft = {
      sessions: [
        {
          day: 1,
          type: "strength",
          muscleGroups: ["push"],
          intensity: "moderate",
          durationMin: 60,
          description: "bench",
        },
        {
          day: 3,
          type: "plyometrics",
          muscleGroups: ["legs"],
          intensity: "heavy",
          durationMin: 60,
          description: "jumps",
        },
        {
          day: 4,
          type: "cardio",
          muscleGroups: ["cardio"],
          intensity: "moderate",
          durationMin: 40,
          description: "intervals",
        },
        {
          day: 5,
          type: "mobility",
          muscleGroups: ["core"],
          intensity: "light",
          durationMin: 30,
          description: "mobility",
        },
      ],
    };
    const okFetch = (() =>
      Promise.resolve(
        new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(draft) } }] }), { status: 200 }),
      )) as unknown as typeof fetch;
    const result = await generateWeek(base, { llm: { apiKey: "x", model: "m", fetchImpl: okFetch } });
    expect(result.source).toBe("llm");
    expect(result.validation.valid).toBe(true);
    expect(result.sessions.find((s) => s.day === 3)?.description).toBe("jumps");
  });
});
