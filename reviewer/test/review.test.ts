import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";
import { formatReviewMarkdown } from "../src/format.js";
import { buildReviewPrompt, truncateDiff } from "../src/prompts.js";
import { normalize, reviewDiff } from "../src/review.js";
import { REVIEW_SCHEMA, type Review } from "../src/review-schema.js";

const sampleReview: Review = {
  implementationCorrectness: 4,
  idiomaticity: 7,
  complexity: 6,
  testRiskCoverage: 2,
  documentation: 5,
  securitySafety: 3,
  verdict: "fail",
  summary: "Zapytanie SQL skleja dane użytkownika - **SQL injection** w `src/db.ts`.",
};

function mockModel(json: unknown) {
  return new MockLanguageModelV3({
    doGenerate: {
      content: [{ type: "text", text: JSON.stringify(json) }],
      finishReason: { unified: "stop", raw: "stop" },
      usage: {
        inputTokens: { total: 120, noCache: 120, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 40, text: 40, reasoning: undefined },
      },
      warnings: [],
      providerMetadata: { openrouter: { usage: { cost: 0.00012 } } },
    },
  });
}

describe("prompt building", () => {
  it("includes title, body and the fenced diff", () => {
    const { prompt, diff } = buildReviewPrompt({ prTitle: "feat: x", prBody: "why", diff: "+a\n-b" });
    expect(prompt).toContain("# Pull request: feat: x");
    expect(prompt).toContain("why");
    expect(prompt).toContain("```diff\n+a\n-b\n```");
    expect(diff.truncated).toBe(false);
  });

  it("truncates long diffs and says so", () => {
    const t = truncateDiff("x".repeat(100), 10);
    expect(t.truncated).toBe(true);
    expect(t.text.startsWith("xxxxxxxxxx\n")).toBe(true);
    expect(t.text).toContain("pokazano 10 z 100");
  });
});

describe("reviewDiff", () => {
  it("returns a schema-valid review, usage and cost from the model", async () => {
    const model = mockModel(sampleReview);
    const result = await reviewDiff({ prTitle: "t", diff: "+x" }, { model });
    expect(REVIEW_SCHEMA.safeParse(result.review).success).toBe(true);
    expect(result.review.verdict).toBe("fail");
    expect(result.usage.steps).toBe(1);
    expect(result.usage.inputTokens).toBe(120);
    expect(result.usage.cost).toBeCloseTo(0.00012);
    // the system instructions and the prompt reached the model
    const call = model.doGenerateCalls[0];
    expect(JSON.stringify(call.prompt)).toContain("recenzentem kodu");
    expect(JSON.stringify(call.prompt)).toContain("Pull request: t");
  });

  it("rejects output without a binding verdict", async () => {
    const { verdict: _drop, ...noVerdict } = sampleReview;
    await expect(reviewDiff({ prTitle: "t", diff: "+x" }, { model: mockModel(noVerdict) })).rejects.toThrow();
  });
});

describe("normalize", () => {
  it("clamps and rounds scores into 1-10", () => {
    const n = normalize({ ...sampleReview, implementationCorrectness: 0, idiomaticity: 11, complexity: 6.6 });
    expect(n.implementationCorrectness).toBe(1);
    expect(n.idiomaticity).toBe(10);
    expect(n.complexity).toBe(7);
  });
});

describe("formatReviewMarkdown", () => {
  it("renders verdict, six scores, summary and footer", () => {
    const md = formatReviewMarkdown(sampleReview, { model: "m", cost: 0.0001, truncated: true });
    expect(md).toContain("AI Code Review: **fail**");
    expect(md.match(/\/10 \|/g)).toHaveLength(6);
    expect(md).toContain("SQL injection");
    expect(md).toContain("model: `m`");
    expect(md).toContain("obcięty");
  });
});
