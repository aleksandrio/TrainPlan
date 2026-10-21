import { describe, expect, it } from "vitest";
import { replanAfterSkip } from "./replan";
import { goalUS01, session, volleyball } from "./fixtures";

// Mon volleyball (locked), Tue light push, Thu heavy legs, Sat heavy legs. Valid: Thu/Sat are 2 days apart.
const us02Week = () => [
  volleyball(),
  session({ id: "tue", day: 1, intensity: "light", muscleGroups: ["push"], durationMin: 30 }),
  session({ id: "thu", day: 3, intensity: "heavy", muscleGroups: ["legs"], type: "plyometrics" }),
  session({ id: "sat", day: 5, intensity: "heavy", muscleGroups: ["legs"], durationMin: 45 }),
];

describe("replanAfterSkip (US-02)", () => {
  it("drops the skipped heavy legs session when the only free day would break 48 h", () => {
    // Thu skipped on Thursday; the only free available day after today is Fri, which is
    // adjacent to Saturday's heavy legs -> dropped with the rule named, week stays valid.
    const proposal = replanAfterSkip(us02Week(), goalUS01, "thu", 3);
    expect(proposal.changes).toHaveLength(1);
    expect(proposal.changes[0]).toMatchObject({ sessionId: "thu", fromDay: 3, toDay: null, action: "dropped" });
    expect(proposal.changes[0].reason).toContain("48 h regeneration");
    expect(proposal.validation.valid).toBe(true);
    expect(proposal.sessions.find((s) => s.id === "thu")?.status).toBe("skipped");
  });

  it("moves the session when a free day fits every rule", () => {
    // Skip Tuesday light push on Tuesday; Friday is free and fits every rule.
    const proposal = replanAfterSkip(us02Week(), goalUS01, "tue", 1);
    expect(proposal.changes[0]).toMatchObject({ sessionId: "tue", fromDay: 1, toDay: 4, action: "moved" });
    expect(proposal.changes[0].reason).toContain("moved to Fri");
    const moved = proposal.sessions.find((s) => s.id === "tue");
    expect(moved?.day).toBe(4);
    expect(moved?.status).toBe("planned");
    expect(proposal.validation.valid).toBe(true);
  });

  it("never changes done sessions", () => {
    const week = us02Week().map((s) => (s.id === "thu" ? { ...s, status: "done" as const } : s));
    const proposal = replanAfterSkip(week, goalUS01, "tue", 1);
    const thu = proposal.sessions.find((s) => s.id === "thu");
    expect(thu).toMatchObject({ day: 3, status: "done" });
  });

  it("drops the session when no free available day is left", () => {
    // Skip Saturday session on Saturday: nothing after today.
    const week = us02Week();
    const proposal = replanAfterSkip(week, goalUS01, "sat", 5);
    expect(proposal.changes[0]).toMatchObject({ sessionId: "sat", action: "dropped", toDay: null });
    expect(proposal.changes[0].reason).toContain("No free available day");
  });

  it("does not move a moderate session onto the day before the commitment", () => {
    const goal = { ...goalUS01, availableDays: [1, 3, 6] as const };
    const week = [volleyball(), session({ id: "thu", day: 3, intensity: "moderate", muscleGroups: ["push"] })];
    const proposal = replanAfterSkip(week, { ...goal, availableDays: [1, 3, 6] }, "thu", 3);
    expect(proposal.changes[0].action).toBe("dropped");
    expect(proposal.changes[0].reason).toContain("Sun must be light");
  });

  it("keeps a locked commitment where it is", () => {
    const proposal = replanAfterSkip(us02Week(), goalUS01, "commitment", 0);
    expect(proposal.changes[0]).toMatchObject({ action: "kept", sessionId: "commitment" });
  });

  it("returns the week unchanged for an unknown session id", () => {
    const week = us02Week();
    const proposal = replanAfterSkip(week, goalUS01, "nope", 1);
    expect(proposal.sessions).toEqual(week);
    expect(proposal.changes).toEqual([]);
  });
});
