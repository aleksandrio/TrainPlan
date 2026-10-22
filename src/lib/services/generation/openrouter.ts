import type { GoalInput, Violation } from "@/types";
import { WEEKDAY_LABELS } from "@/types";
import { generatedWeekSchema } from "@/lib/validation";
import { WEEKLY_LIMIT, INTENSITY_FACTOR } from "@/lib/services/rules";
import type { DraftSession } from "./template";
import { normalizeLlmWeek, type NormalizedSession } from "./normalize";

export interface LlmConfig {
  apiKey: string;
  model: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class LlmError extends Error {}

function buildPrompt(goal: GoalInput, locked: DraftSession[], violations?: Violation[]): string {
  const days = goal.availableDays.map((d) => WEEKDAY_LABELS[d]).join(", ");
  const lockedText = locked.length
    ? locked
        .map((s) => `${WEEKDAY_LABELS[s.day]}: ${s.description} (fixed, heavy, legs+cardio, do NOT plan this day)`)
        .join("; ")
    : "none";
  const fix = violations?.length
    ? `\nYour previous draft broke these rules, fix them:\n${violations.map((v) => `- ${v.message}`).join("\n")}`
    : "";
  return `You are a strength and conditioning coach. Plan ONE training week for this athlete.

Goal: ${goal.goalText}
Level: ${goal.level} (weekly load limit ${WEEKLY_LIMIT[goal.level]} points)
Available training days: ${days} (plan exactly one session on each available day, none on other days)
Fixed commitments: ${lockedText}
Notes: ${goal.notes || "none"}

Rules the week MUST satisfy:
1. Two heavy sessions sharing a muscle group must be at least 2 days apart (not same or adjacent days). Fixed commitments count as heavy legs+cardio.
2. Total weekly load <= limit. Load of a session = ceil(durationMin/30) * factor, factor light=${INTENSITY_FACTOR.light}, moderate=${INTENSITY_FACTOR.moderate}, heavy=${INTENSITY_FACTOR.heavy}. Fixed commitment counts 9.
3. The day before a fixed commitment must be light or rest.
${fix}
Return ONLY a JSON object with a "sessions" array, no prose. Field rules:
- "day": integer 0-6 where 0=Monday, 1=Tuesday, ... 6=Sunday (a number, not a name)
- "type": exactly one of "strength", "cardio", "mobility", "plyometrics", "other"
- "muscleGroups": array with 1-3 values, each exactly one of "legs", "push", "pull", "core", "cardio" (chest/shoulders/triceps = "push", back/biceps = "pull")
- "intensity": exactly one of "light", "moderate", "heavy"
- "durationMin": integer minutes, 10-240
- "description": concrete exercises, sets and reps in one or two sentences
Example: {"sessions":[{"day":1,"type":"strength","muscleGroups":["push","core"],"intensity":"moderate","durationMin":60,"description":"Bench press 4x6, overhead press 3x8, dips 3x10, plank 3x45s."}]}`;
}

export async function draftWeekWithLlm(
  goal: GoalInput,
  locked: DraftSession[],
  config: LlmConfig,
  violations?: Violation[],
): Promise<DraftSession[]> {
  const fetchImpl = config.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, config.timeoutMs ?? 20_000);
  let text: string;
  try {
    const res = await fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://trainplan.app",
        "X-Title": "TrainPlan",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.4,
        max_tokens: 1500,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: buildPrompt(goal, locked, violations) }],
      }),
    });
    if (!res.ok) throw new LlmError(`OpenRouter responded ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    text = data.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    if (err instanceof LlmError) throw err;
    throw new LlmError(err instanceof Error ? err.message : "LLM request failed");
  } finally {
    clearTimeout(timer);
  }

  const jsonText = extractJson(text);
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonText);
  } catch {
    // eslint-disable-next-line no-console
    console.warn("[llm] invalid JSON:", text.slice(0, 300));
    throw new LlmError("LLM returned invalid JSON");
  }

  // Strict schema first; if the model strayed from the enums, normalise synonyms and keep what is usable.
  const strict = generatedWeekSchema.safeParse(parsedJson);
  let sessions: NormalizedSession[];
  if (strict.success) {
    sessions = strict.data.sessions as NormalizedSession[];
  } else {
    const normalized = normalizeLlmWeek(parsedJson);
    // eslint-disable-next-line no-console
    if (normalized.dropped.length) console.warn("[llm] dropped sessions:", normalized.dropped.join(" | "));
    if (normalized.sessions.length === 0) {
      // eslint-disable-next-line no-console
      console.warn("[llm] unusable draft:", jsonText.slice(0, 300));
      const why =
        (normalized.dropped as (string | undefined)[])[0] ??
        (strict.error.issues[0] as { message: string } | undefined)?.message ??
        "no sessions";
      throw new LlmError(`LLM JSON did not match the schema (${why})`);
    }
    sessions = normalized.sessions;
  }

  const lockedDays = new Set(locked.map((s) => s.day));
  return sessions
    .filter((s) => !lockedDays.has(s.day))
    .map((s) => ({
      day: s.day,
      type: s.type,
      muscleGroups: s.muscleGroups,
      intensity: s.intensity,
      durationMin: s.durationMin,
      description: s.description,
      status: "planned" as const,
      locked: false,
      source: "generated" as const,
    }));
}

function extractJson(text: string): string {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const objStart = cleaned.indexOf("{");
  const arrStart = cleaned.indexOf("[");
  const startsWithArray = arrStart >= 0 && (objStart === -1 || arrStart < objStart);
  const start = startsWithArray ? arrStart : objStart;
  const end = startsWithArray ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
  return start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
}
