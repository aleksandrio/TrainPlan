// CLI entry used by the composite action and locally:
//   DIFF_FILE=pr.diff PR_TITLE="..." PR_BODY="..." LLM_PROVIDER_API_KEY=... node dist/review.js
// Prints the JSON review on stdout (the CI gate reads `verdict`), diagnostics go to stderr.
// Flags: --markdown <file> also writes the PR comment; --repo-root <dir> enables the read-only file tool.
import { readFile, writeFile } from "node:fs/promises";
import { DEFAULT_MODEL } from "./agent.js";
import { formatReviewMarkdown } from "./format.js";
import { reviewDiff } from "./review.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const diffFile = args.get("diff") ?? process.env.DIFF_FILE;
  if (!diffFile) throw new Error("Provide the diff with DIFF_FILE=<path> or --diff <path>");

  const diff = await readFile(diffFile, "utf8");
  if (!diff.trim()) throw new Error(`Diff file ${diffFile} is empty - nothing to review`);

  const modelId = process.env.REVIEW_MODEL ?? DEFAULT_MODEL;
  const repoRoot = args.get("repo-root") ?? (process.env.REVIEW_ALLOW_TOOLS === "1" ? process.cwd() : undefined);

  const { review, usage, diffTruncated } = await reviewDiff(
    { prTitle: process.env.PR_TITLE ?? "", prBody: process.env.PR_BODY, diff },
    { modelId, repoRoot },
  );

  console.error(
    `[reviewer] model=${modelId} steps=${usage.steps} tokens=${usage.totalTokens ?? "?"} (in ${usage.inputTokens ?? "?"} / out ${usage.outputTokens ?? "?"})` +
      (usage.cost !== undefined ? ` cost=$${usage.cost.toFixed(5)}` : "") +
      (diffTruncated ? " diff=truncated" : ""),
  );

  const markdownFile = args.get("markdown") ?? process.env.REVIEW_MARKDOWN_FILE;
  if (markdownFile) {
    await writeFile(markdownFile, formatReviewMarkdown(review, { model: modelId, cost: usage.cost, truncated: diffTruncated }));
  }

  process.stdout.write(JSON.stringify(review, null, 2) + "\n");
}

function parseArgs(argv: string[]) {
  const out = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        out.set(key, next);
        i++;
      } else out.set(key, "true");
    }
  }
  return out;
}

main().catch((error: unknown) => {
  console.error(`[reviewer] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
