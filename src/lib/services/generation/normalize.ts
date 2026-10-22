import type { Intensity, MuscleGroup, SessionType, Weekday } from "@/types";
import { INTENSITIES, MUSCLE_GROUPS, SESSION_TYPES } from "@/types";
import { generatedSessionSchema } from "@/lib/validation";

/**
 * Lenient normalisation of an LLM week draft before the strict zod schema.
 * Models rarely follow the enums to the letter ("chest" instead of "push", "Monday" instead of 0,
 * "60 min" instead of 60, a top-level array instead of {sessions}); this maps the common variants
 * onto the domain vocabulary and drops only the sessions that still cannot be interpreted.
 */
export interface NormalizedWeek {
  sessions: NormalizedSession[];
  /** Human-readable reasons for sessions that were dropped (first zod issue each). */
  dropped: string[];
}

export interface NormalizedSession {
  day: Weekday;
  type: SessionType;
  muscleGroups: MuscleGroup[];
  intensity: Intensity;
  durationMin: number;
  description: string;
}

const DAY_NAMES: Record<string, Weekday> = {
  mon: 0,
  monday: 0,
  pon: 0,
  poniedzialek: 0,
  tue: 1,
  tues: 1,
  tuesday: 1,
  wt: 1,
  wtorek: 1,
  wed: 2,
  wednesday: 2,
  sr: 2,
  sroda: 2,
  thu: 3,
  thur: 3,
  thurs: 3,
  thursday: 3,
  czw: 3,
  czwartek: 3,
  fri: 4,
  friday: 4,
  pt: 4,
  piatek: 4,
  sat: 5,
  saturday: 5,
  sob: 5,
  sobota: 5,
  sun: 6,
  sunday: 6,
  nd: 6,
  ndz: 6,
  niedziela: 6,
};

const TYPE_SYNONYMS: [RegExp, SessionType][] = [
  [/plyo|jump|power|explosive|sprint/, "plyometrics"],
  [/strength|lift|weight|resistance|gym|hypertroph|upper|lower|legs?\b|push|pull|full.?body/, "strength"],
  [/cardio|run|jog|bike|cycl|swim|row|hiit|interval|conditioning|endurance|aerobic|tempo/, "cardio"],
  [/mobil|stretch|yoga|recover|rest|flexib|foam|core/, "mobility"],
  [/team|match|game|volley|football|soccer|basket|practice/, "team_sport"],
];

const GROUP_SYNONYMS: [RegExp, MuscleGroup[]][] = [
  [/full.?body|total.?body|whole.?body|cale.?cialo/, ["legs", "push", "pull"]],
  [/upper.?body|gora/, ["push", "pull"]],
  [/leg|lower|glute|ham|quad|calf|calves|hip|posterior|nogi|posladk|udo|uda|lydk/, ["legs"]],
  [/push|chest|pec|shoulder|delt|tricep|press|klat|bark|tricep/, ["push"]],
  [/pull|back|lat|bicep|row|rear|trap|plecy|bicep/, ["pull"]],
  [/core|ab|trunk|oblique|plank|brzuch|stabil/, ["core"]],
  [/cardio|aerob|conditioning|endurance|heart|run|bike|swim|wytrzym|kondycj/, ["cardio"]],
];

const TYPE_DEFAULT_GROUPS: Record<SessionType, MuscleGroup[]> = {
  strength: ["push", "pull"],
  cardio: ["cardio"],
  mobility: ["core"],
  plyometrics: ["legs"],
  team_sport: ["legs", "cardio"],
  other: ["core"],
};

function ascii(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L").toLowerCase().trim();
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
}

export function normalizeDay(raw: unknown): Weekday | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const n = Math.round(raw);
    return n >= 0 && n <= 6 ? (n as Weekday) : null;
  }
  if (typeof raw === "string") {
    const s = ascii(raw);
    if (/^\d+$/.test(s)) return normalizeDay(Number(s));
    const key = s.replace(/[^a-z]/g, "");
    if (key in DAY_NAMES) return DAY_NAMES[key];
    for (const [name, day] of Object.entries(DAY_NAMES)) if (name.length >= 3 && key.startsWith(name)) return day;
  }
  return null;
}

export function normalizeType(raw: unknown, groups: MuscleGroup[]): SessionType {
  if (typeof raw === "string") {
    const s = ascii(raw).replace(/[\s-]+/g, "_");
    if ((SESSION_TYPES as readonly string[]).includes(s)) return s as SessionType;
    for (const [re, type] of TYPE_SYNONYMS) if (re.test(s)) return type;
  }
  if (groups.length === 1 && groups[0] === "cardio") return "cardio";
  return groups.length ? "strength" : "other";
}

export function normalizeGroups(raw: unknown): MuscleGroup[] {
  const items: string[] = Array.isArray(raw)
    ? raw.filter((x): x is string => typeof x === "string")
    : typeof raw === "string"
      ? raw.split(/[,/+&;]|\band\b|\bi\b/)
      : [];
  const out = new Set<MuscleGroup>();
  for (const item of items) {
    const s = ascii(item);
    if (!s) continue;
    if ((MUSCLE_GROUPS as readonly string[]).includes(s)) {
      out.add(s as MuscleGroup);
      continue;
    }
    for (const [re, groups] of GROUP_SYNONYMS) {
      if (re.test(s)) {
        groups.forEach((g) => out.add(g));
        break;
      }
    }
  }
  return [...out].slice(0, 5);
}

export function normalizeIntensity(raw: unknown): Intensity {
  if (typeof raw === "string") {
    const s = ascii(raw);
    if ((INTENSITIES as readonly string[]).includes(s)) return s as Intensity;
    if (/easy|low|recover|gentle|lekk|latw|niski/.test(s)) return "light";
    if (/hard|high|heavy|intense|max|ciez|wysok|mocn/.test(s)) return "heavy";
    if (/mod|medium|sredni|umiark/.test(s)) return "moderate";
  }
  if (typeof raw === "number") return raw <= 1 ? "light" : raw >= 3 ? "heavy" : "moderate";
  return "moderate";
}

export function normalizeDuration(raw: unknown): number {
  let n: number | null = null;
  if (typeof raw === "number" && Number.isFinite(raw)) n = raw;
  else if (typeof raw === "string") {
    const m = /(\d+(?:[.,]\d+)?)\s*(h|hr|hour|godz)?/i.exec(raw);
    if (m) {
      n = Number(m[1].replace(",", "."));
      if (m[2]) n *= 60;
    }
  }
  if (n === null) return 45;
  return Math.min(240, Math.max(10, Math.round(n)));
}

function sessionsArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    for (const key of ["sessions", "week", "plan", "days", "workouts", "trainings", "schedule"]) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
      if (obj[key] && typeof obj[key] === "object") return sessionsArray(obj[key]);
    }
    const firstArray = Object.values(obj).find(Array.isArray);
    if (firstArray) return firstArray as unknown[];
    // object keyed by day name: {"Monday": {...}, "Tuesday": {...}}
    const entries = Object.entries(obj).filter(([k, v]) => normalizeDay(k) !== null && v && typeof v === "object");
    if (entries.length) return entries.map(([k, v]) => ({ day: k, ...(v as Record<string, unknown>) }));
  }
  return [];
}

export function normalizeLlmWeek(raw: unknown): NormalizedWeek {
  const sessions: NormalizedSession[] = [];
  const dropped: string[] = [];
  for (const item of sessionsArray(raw).slice(0, 14)) {
    if (!item || typeof item !== "object") {
      dropped.push("session is not an object");
      continue;
    }
    const obj = item as Record<string, unknown>;
    const day = normalizeDay(pick(obj, ["day", "weekday", "dayOfWeek", "day_of_week", "date", "dzien"]));
    if (day === null) {
      dropped.push(`unrecognised day ${JSON.stringify(obj.day ?? obj.weekday ?? null)}`);
      continue;
    }
    const groups = normalizeGroups(
      pick(obj, ["muscleGroups", "muscle_groups", "muscles", "muscleGroup", "focus", "bodyParts", "target"]),
    );
    const type = normalizeType(pick(obj, ["type", "sessionType", "session_type", "kind", "category"]), groups);
    if (type === "team_sport") {
      dropped.push("team sport sessions are planned only from the fixed commitment");
      continue;
    }
    const muscleGroups = groups.length ? groups : TYPE_DEFAULT_GROUPS[type];
    const descRaw = pick(obj, ["description", "details", "exercises", "workout", "notes", "content", "plan"]);
    const description = (
      typeof descRaw === "string" ? descRaw : Array.isArray(descRaw) ? descRaw.map(String).join("; ") : ""
    )
      .trim()
      .slice(0, 1000);
    const candidate = {
      day,
      type,
      muscleGroups,
      intensity: normalizeIntensity(pick(obj, ["intensity", "effort", "rpe", "level"])),
      durationMin: normalizeDuration(
        pick(obj, ["durationMin", "duration_min", "durationMinutes", "duration", "minutes", "length", "time"]),
      ),
      description: description || `${type} session`,
    };
    const parsed = generatedSessionSchema.safeParse(candidate);
    if (parsed.success) sessions.push(candidate);
    else {
      const issue = parsed.error.issues[0] as { path: PropertyKey[]; message: string } | undefined;
      dropped.push(issue ? `${issue.path.join(".")}: ${issue.message}` : "invalid session");
    }
  }
  return { sessions, dropped };
}
