// Markdown rendering of a review for the PR comment.
import { SCORE_KEYS, type Review } from "./review-schema.js";

const LABELS: Record<(typeof SCORE_KEYS)[number], string> = {
  implementationCorrectness: "Poprawność implementacji",
  idiomaticity: "Idiomatyczność",
  complexity: "Złożoność",
  testRiskCoverage: "Testy vs ryzyko",
  documentation: "Dokumentacja",
  securitySafety: "Bezpieczeństwo",
};

export function formatReviewMarkdown(review: Review, meta: { model?: string; cost?: number; truncated?: boolean } = {}) {
  const icon = review.verdict === "pass" ? "✅" : "❌";
  const rows = SCORE_KEYS.map((key) => `| ${LABELS[key]} | ${review[key]}/10 |`).join("\n");
  const footer = [
    meta.model ? `model: \`${meta.model}\`` : null,
    meta.cost !== undefined ? `koszt: $${meta.cost.toFixed(4)}` : null,
    meta.truncated ? "diff został obcięty (limit DIFF_MAX_CHARS)" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return [
    `## ${icon} AI Code Review: **${review.verdict}**`,
    "",
    "| Kryterium | Ocena |",
    "| --- | --- |",
    rows,
    "",
    review.summary.trim(),
    "",
    footer ? `<sub>${footer}</sub>` : "",
  ].join("\n");
}
