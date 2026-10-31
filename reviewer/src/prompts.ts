// Prompt building for the review agent. Kept separate from the agent so the same text can be
// reused by promptfoo (prompts/review.txt mirrors this) and by tests.
import { SYSTEM_PROMPT } from "./review-schema.js";

export { SYSTEM_PROMPT };

export const DEFAULT_DIFF_MAX_CHARS = 120_000;

export const REVIEW_INSTRUCTIONS = `${SYSTEM_PROMPT}

Zasady oceny:
- Oceniaj wyłącznie to, co widać w diffie i w opisie PR-a. Nie zgaduj kodu poza diffem; jeśli brakuje kontekstu, obniż pewność w podsumowaniu zamiast wymyślać fakty.
- Werdykt "fail" wydaj, gdy zmiana wprowadza błąd funkcjonalny, podatność bezpieczeństwa, regresję albo ryzykowną logikę bez żadnych testów. Styl i drobiazgi same w sobie nie są powodem do "fail".
- Pisz podsumowanie po polsku, zwięźle, w Markdown. Wymień konkretne pliki i linie z diffu, które wymagają poprawy, w kolejności od najpoważniejszego problemu.
- Projekt: TrainPlan - Astro 7 SSR, React 19, TypeScript, Tailwind 4, Supabase (RLS), Cloudflare Workers, Vitest, Playwright.`;

export interface ReviewInput {
  prTitle: string;
  prBody?: string;
  diff: string;
}

export interface TruncatedDiff {
  text: string;
  truncated: boolean;
  originalChars: number;
}

/** Cost guard: keep the beginning of the diff and tell the model it was cut. */
export function truncateDiff(diff: string, maxChars: number = DEFAULT_DIFF_MAX_CHARS): TruncatedDiff {
  if (diff.length <= maxChars) return { text: diff, truncated: false, originalChars: diff.length };
  const head = diff.slice(0, maxChars);
  return {
    text: `${head}\n\n[... diff obcięty: pokazano ${maxChars} z ${diff.length} znaków ...]`,
    truncated: true,
    originalChars: diff.length,
  };
}

export function buildReviewPrompt(input: ReviewInput, maxChars?: number): { prompt: string; diff: TruncatedDiff } {
  const diff = truncateDiff(input.diff, maxChars);
  const body = input.prBody?.trim() ? input.prBody.trim() : "(brak opisu)";
  const prompt = [
    `# Pull request: ${input.prTitle.trim() || "(bez tytułu)"}`,
    "",
    "## Opis PR-a",
    body,
    "",
    "## Diff",
    "```diff",
    diff.text,
    "```",
    "",
    "Oceń tę zmianę zgodnie z sześcioma kryteriami i wydaj werdykt.",
  ].join("\n");
  return { prompt, diff };
}
