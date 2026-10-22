import type { GoalInput, WeekValidation } from "@/types";
import { validateWeek } from "@/lib/services/rules";
import { draftWeekWithLlm, LlmError, type LlmConfig } from "./openrouter";
import { commitmentSession, repairDraft, templateWeek, type DraftSession } from "./template";

export type GenerationSource = "llm" | "llm-repaired" | "template";

export interface GenerationResult {
  sessions: DraftSession[];
  validation: WeekValidation;
  source: GenerationSource;
  note: string | null;
}

export interface GenerateOptions {
  llm?: LlmConfig | null;
  /** Sessions that must stay exactly as they are (done sessions on regenerate). Their days are not planned. */
  keep?: DraftSession[];
}

/**
 * Produce a rule-valid week for the goal.
 * Order: LLM draft -> validate -> deterministic repair of the draft -> deterministic template fallback.
 */
export async function generateWeek(goal: GoalInput, opts: GenerateOptions = {}): Promise<GenerationResult> {
  const keep = opts.keep ?? [];
  const commitment = commitmentSession(goal);
  const lockedBase = commitment && !keep.some((s) => s.day === commitment.day) ? [commitment] : [];
  const locked = [...lockedBase, ...keep];
  const planningGoal: GoalInput = {
    ...goal,
    availableDays: goal.availableDays.filter((d) => !locked.some((s) => s.day === d)),
  };

  if (opts.llm) {
    try {
      const draft = await draftWeekWithLlm(planningGoal, locked, opts.llm);
      const first = [...locked, ...draft];
      const v1 = validateWeek(first, goal);
      if (v1.valid) return { sessions: sortDraft(first), validation: v1, source: "llm", note: null };

      const repaired = repairDraft(draft, goal, locked);
      const v2 = validateWeek(repaired, goal);
      if (v2.valid) {
        return {
          sessions: repaired,
          validation: v2,
          source: "llm-repaired",
          note: "The AI draft broke a rule; the marked sessions were adjusted to keep the week valid.",
        };
      }
      return fallback(
        planningGoal,
        goal,
        locked,
        "The AI draft could not be made rule-valid; a template week was used instead.",
      );
    } catch (err) {
      const reason = err instanceof LlmError ? err.message : "AI generation failed";
      return fallback(planningGoal, goal, locked, `${reason}; a template week was used instead.`);
    }
  }

  return fallback(planningGoal, goal, locked, null);
}

function fallback(
  planningGoal: GoalInput,
  goal: GoalInput,
  locked: DraftSession[],
  note: string | null,
): GenerationResult {
  const sessions = templateWeek(planningGoal, locked);
  return { sessions, validation: validateWeek(sessions, goal), source: "template", note };
}

function sortDraft(sessions: DraftSession[]): DraftSession[] {
  return [...sessions].sort((a, b) => a.day - b.day);
}
