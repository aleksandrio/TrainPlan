import type { Goal, Plan, ReplanChange, ReplanProposal, SessionStatus, Weekday, WeekValidation } from "@/types";
import type { SessionFormValues } from "./SessionForm";

export interface WeekStateDto {
  goal: Goal | null;
  plan: Plan | null;
  validation: WeekValidation | null;
  weekStart: string;
  today: Weekday;
}

export interface GenerateResponse {
  plan: Plan;
  validation: WeekValidation;
  source: "llm" | "llm-repaired" | "template";
  note: string | null;
  today: Weekday;
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export const api = {
  generate: (keepDone: boolean) =>
    call<GenerateResponse>("/api/plan/generate", { method: "POST", body: JSON.stringify({ keepDone }) }),
  patchSession: (id: string, patch: Partial<SessionFormValues> & { status?: SessionStatus }) =>
    call<WeekStateDto>(`/api/sessions/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteSession: (id: string) => call<WeekStateDto>(`/api/sessions/${id}`, { method: "DELETE" }),
  addSession: (input: SessionFormValues) =>
    call<WeekStateDto>("/api/sessions", { method: "POST", body: JSON.stringify(input) }),
  proposeReplan: (sessionId: string) =>
    call<{ proposal: ReplanProposal }>("/api/plan/replan", { method: "POST", body: JSON.stringify({ sessionId }) }),
  applyReplan: (sessionId: string) =>
    call<WeekStateDto & { changes: ReplanChange[] }>("/api/plan/replan", {
      method: "PUT",
      body: JSON.stringify({ sessionId }),
    }),
};
