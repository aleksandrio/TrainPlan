import { describe, expect, it } from "vitest";
import { goalInputSchema, sessionPatchSchema } from "./validation";

describe("goalInputSchema", () => {
  const valid = {
    goalText: "Better conditioning for Monday volleyball",
    level: "intermediate",
    availableDays: [1, 3, 4, 5],
    fixedCommitment: { day: 0, label: "volleyball" },
    notes: "",
  };

  it("accepts a complete goal", () => {
    const result = goalInputSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects duplicate or missing days", () => {
    expect(goalInputSchema.safeParse({ ...valid, availableDays: [] }).success).toBe(false);
    expect(goalInputSchema.safeParse({ ...valid, availableDays: [1, 1] }).success).toBe(false);
  });

  it("accepts no commitment and defaults notes", () => {
    const result = goalInputSchema.safeParse({ ...valid, fixedCommitment: null, notes: undefined });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.notes).toBe("");
  });

  it("rejects unknown level", () => {
    expect(goalInputSchema.safeParse({ ...valid, level: "pro" }).success).toBe(false);
  });
});

describe("sessionPatchSchema", () => {
  it("rejects an empty patch and accepts a status change", () => {
    expect(sessionPatchSchema.safeParse({}).success).toBe(false);
    expect(sessionPatchSchema.safeParse({ status: "done" }).success).toBe(true);
  });
});
