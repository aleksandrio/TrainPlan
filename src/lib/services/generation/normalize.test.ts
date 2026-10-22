import { describe, expect, it } from "vitest";
import type { GoalInput } from "@/types";
import { generateWeek } from "./index";
import { normalizeDay, normalizeDuration, normalizeGroups, normalizeIntensity, normalizeLlmWeek } from "./normalize";

describe("normalize LLM vocabulary", () => {
  it("maps day names, numeric strings and Polish names to 0-6", () => {
    expect(normalizeDay("Monday")).toBe(0);
    expect(normalizeDay("tue")).toBe(1);
    expect(normalizeDay("Środa")).toBe(2);
    expect(normalizeDay("4")).toBe(4);
    expect(normalizeDay(6)).toBe(6);
    expect(normalizeDay(7)).toBeNull();
    expect(normalizeDay("someday")).toBeNull();
  });

  it("maps muscle synonyms onto the five groups", () => {
    expect(normalizeGroups(["chest", "shoulders", "triceps"])).toEqual(["push"]);
    expect(normalizeGroups(["back", "biceps"])).toEqual(["pull"]);
    expect(normalizeGroups("quads, hamstrings and glutes")).toEqual(["legs"]);
    expect(normalizeGroups(["abs", "conditioning"])).toEqual(["core", "cardio"]);
    expect(normalizeGroups(["full body"])).toEqual(["legs", "push", "pull"]);
    expect(normalizeGroups(["unknown"])).toEqual([]);
  });

  it("maps intensity and duration variants", () => {
    expect(normalizeIntensity("Hard")).toBe("heavy");
    expect(normalizeIntensity("easy")).toBe("light");
    expect(normalizeIntensity("medium")).toBe("moderate");
    expect(normalizeIntensity(undefined)).toBe("moderate");
    expect(normalizeDuration("60 min")).toBe(60);
    expect(normalizeDuration("1.5 h")).toBe(90);
    expect(normalizeDuration(500)).toBe(240);
    expect(normalizeDuration(undefined)).toBe(45);
  });

  it("accepts a top-level array and a week keyed by day names", () => {
    const fromArray = normalizeLlmWeek([
      { day: "Tuesday", type: "Upper body", muscles: ["chest", "back"], intensity: "hard", duration: "45 minutes" },
    ]);
    expect(fromArray.sessions).toEqual([
      {
        day: 1,
        type: "strength",
        muscleGroups: ["push", "pull"],
        intensity: "heavy",
        durationMin: 45,
        description: "strength session",
      },
    ]);

    const keyed = normalizeLlmWeek({
      Wednesday: { type: "run", intensity: "easy", durationMin: 30, description: "easy jog" },
      Friday: { type: "yoga", durationMin: 40 },
    });
    expect(keyed.sessions.map((s) => [s.day, s.type, s.muscleGroups])).toEqual([
      [2, "cardio", ["cardio"]],
      [4, "mobility", ["core"]],
    ]);
  });

  it("drops only the sessions that cannot be interpreted and reports why", () => {
    const result = normalizeLlmWeek({
      sessions: [
        {
          day: "Monday",
          type: "strength",
          muscleGroups: ["legs"],
          intensity: "heavy",
          durationMin: 60,
          description: "x",
        },
        { day: "never", type: "strength" },
        "not an object",
      ],
    });
    expect(result.sessions).toHaveLength(1);
    expect(result.dropped).toHaveLength(2);
    expect(result.dropped[0]).toContain("unrecognised day");
  });
});

describe("generateWeek with a messy LLM draft", () => {
  const goal: GoalInput = {
    goalText: "conditioning and jump",
    level: "intermediate",
    availableDays: [1, 3, 4, 5],
    fixedCommitment: { day: 0, label: "volleyball" },
    notes: "",
  };

  const llmWith = (content: string) =>
    (() =>
      Promise.resolve(
        new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 }),
      )) as unknown as typeof fetch;

  it("keeps the AI content when the model uses synonyms and day names", async () => {
    const content = `\`\`\`json
{"week":[
  {"day":"Tuesday","type":"Strength training","muscleGroups":["Chest","Shoulders"],"intensity":"Moderate","duration":"60 min","description":"Bench 4x6"},
  {"day":"Thursday","type":"Plyometrics","muscleGroups":["Legs"],"intensity":"High","durationMin":50,"description":"Box jumps"},
  {"day":"Friday","type":"Running","muscleGroups":["Cardio"],"intensity":"Moderate","durationMin":40,"description":"Intervals"},
  {"day":"Saturday","type":"Mobility","muscleGroups":["Core"],"intensity":"Light","durationMin":30,"description":"Hips and ankles"}
]}
\`\`\``;
    const result = await generateWeek(goal, { llm: { apiKey: "x", model: "m", fetchImpl: llmWith(content) } });
    expect(result.source).not.toBe("template");
    expect(result.validation.valid).toBe(true);
    expect(result.sessions.find((s) => s.day === 1)?.description).toContain("Bench 4x6");
    expect(result.sessions.find((s) => s.day === 3)?.description).toContain("Box jumps");
  });

  it("falls back to the template with a reason when nothing is usable", async () => {
    const result = await generateWeek(goal, {
      llm: { apiKey: "x", model: "m", fetchImpl: llmWith('{"sessions":[{"day":"whenever"}]}') },
    });
    expect(result.source).toBe("template");
    expect(result.note).toContain("did not match the schema");
    expect(result.note).toContain("unrecognised day");
  });
});
