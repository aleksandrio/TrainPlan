import { useState } from "react";
import type { Goal, Plan, ReplanChange, ReplanProposal, Session, Weekday, WeekValidation } from "@/types";
import { WEEKDAY_LABELS, WEEKDAYS } from "@/types";
import { cn } from "@/lib/utils";
import { api, type WeekStateDto } from "./api";
import { SessionForm, type SessionFormValues } from "./SessionForm";

interface Props {
  goal: Goal;
  plan: Plan | null;
  validation: WeekValidation | null;
  weekStart: string;
  today: Weekday;
}

const intensityStyle: Record<Session["intensity"], string> = {
  light: "bg-emerald-500/20 text-emerald-100 border-emerald-300/30",
  moderate: "bg-amber-500/20 text-amber-100 border-amber-300/30",
  heavy: "bg-rose-500/20 text-rose-100 border-rose-300/30",
};

export default function WeekPlanner(props: Props) {
  const [plan, setPlan] = useState<Plan | null>(props.plan);
  const [validation, setValidation] = useState<WeekValidation | null>(props.validation);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{ sessionId: string; proposal: ReplanProposal } | null>(null);
  const [lastChanges, setLastChanges] = useState<ReplanChange[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<Weekday | null>(null);

  function applyState(state: WeekStateDto) {
    setPlan(state.plan);
    setValidation(state.validation);
  }

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  const generate = () =>
    run("generate", async () => {
      const res = await api.generate(true);
      setPlan(res.plan);
      setValidation(res.validation);
      setNote(res.note);
      setLastChanges(null);
    });

  const setStatus = (s: Session, status: Session["status"]) =>
    run(s.id, async () => {
      if (status === "skipped" && !s.locked) {
        const { proposal: p } = await api.proposeReplan(s.id);
        setProposal({ sessionId: s.id, proposal: p });
        return;
      }
      applyState(await api.patchSession(s.id, { status }));
    });

  const keepWithoutReplan = (sessionId: string) =>
    run(sessionId, async () => {
      applyState(await api.patchSession(sessionId, { status: "skipped" }));
      setProposal(null);
      setLastChanges(null);
    });

  const acceptReplan = (sessionId: string) =>
    run(sessionId, async () => {
      const res = await api.applyReplan(sessionId);
      applyState(res);
      setLastChanges(res.changes);
      setProposal(null);
    });

  const remove = (s: Session) =>
    run(s.id, async () => {
      applyState(await api.deleteSession(s.id));
    });

  const saveEdit = (s: Session) => async (values: SessionFormValues) => {
    applyState(await api.patchSession(s.id, values));
    setEditing(null);
  };

  const saveNew = async (values: SessionFormValues) => {
    applyState(await api.addSession(values));
    setAdding(null);
  };

  const sessionsByDay = (day: Weekday) => plan?.sessions.filter((s) => s.day === day) ?? [];

  return (
    <div className="space-y-4" data-testid="week-planner">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
        <div>
          <h1 className="text-xl font-bold">Week of {props.weekStart}</h1>
          <p className="text-sm text-blue-100/70">
            {props.goal.goalText} · {props.goal.level}
            {props.goal.fixedCommitment &&
              ` · ${props.goal.fixedCommitment.label} on ${WEEKDAY_LABELS[props.goal.fixedCommitment.day]}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {validation && (
            <span
              data-testid="validity-badge"
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-medium",
                validation.valid
                  ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
                  : "border-rose-300/40 bg-rose-500/20 text-rose-100",
              )}
            >
              {validation.valid ? "Valid week" : `${validation.violations.length} rule issue(s)`} · load{" "}
              {validation.load}/{validation.limit}
            </span>
          )}
          <button
            type="button"
            onClick={generate}
            disabled={busy !== null}
            data-testid="generate-button"
            className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-sm font-medium shadow transition hover:opacity-90 disabled:opacity-60"
          >
            {busy === "generate" ? (
              <span className="flex items-center gap-2">
                <span
                  className="size-3 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden
                />
                Preparing your week…
              </span>
            ) : plan ? (
              "Regenerate week"
            ) : (
              "Generate week"
            )}
          </button>
        </div>
      </div>

      {busy === "generate" && (
        <p role="status" className="text-sm text-blue-100/70">
          Drafting sessions and checking regeneration, weekly load and your fixed activity. This can take up to 20
          seconds.
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          <span>{error}</span>
          <button type="button" onClick={generate} className="underline">
            Retry
          </button>
        </div>
      )}

      {note && (
        <p
          className="rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
          data-testid="generation-note"
        >
          {note}
        </p>
      )}

      {validation && validation.violations.length > 0 && (
        <ul
          className="space-y-1 rounded-lg border border-rose-300/30 bg-rose-500/10 p-3 text-sm text-rose-100"
          data-testid="violations"
        >
          {validation.violations.map((v) => (
            <li key={`${v.rule}-${v.days.join("-")}-${v.message}`}>⚠ {v.message}</li>
          ))}
        </ul>
      )}

      {lastChanges && lastChanges.length > 0 && (
        <div
          className="rounded-lg border border-blue-300/30 bg-blue-500/10 p-3 text-sm text-blue-100"
          data-testid="change-summary"
        >
          <p className="mb-1 font-medium">Re-planned:</p>
          <ul className="space-y-1">
            {lastChanges.map((c) => (
              <li key={c.sessionId}>
                {c.action === "moved" ? "➜" : c.action === "dropped" ? "✕" : "•"} {c.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {proposal && (
        <div
          role="dialog"
          aria-label="Re-plan proposal"
          className="rounded-2xl border border-purple-300/40 bg-black/40 p-4 text-sm backdrop-blur-xl"
          data-testid="replan-dialog"
        >
          <p className="mb-2 font-medium">You skipped a session. Here is how the rest of the week could change:</p>
          <ul className="mb-3 space-y-1 text-blue-100/80">
            {proposal.proposal.changes.map((c) => (
              <li key={c.sessionId}>
                {c.action === "moved" ? "➜" : c.action === "dropped" ? "✕" : "•"} {c.reason}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => acceptReplan(proposal.sessionId)}
              disabled={busy !== null}
              className="rounded-md bg-purple-500/70 px-3 py-1.5 font-medium hover:bg-purple-500"
              data-testid="accept-replan"
            >
              Accept re-plan
            </button>
            <button
              type="button"
              onClick={() => keepWithoutReplan(proposal.sessionId)}
              disabled={busy !== null}
              className="rounded-md border border-white/20 px-3 py-1.5 hover:bg-white/10"
              data-testid="keep-plan"
            >
              Just mark as skipped
            </button>
            <button
              type="button"
              onClick={() => {
                setProposal(null);
              }}
              className="rounded-md px-3 py-1.5 text-blue-100/60 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!plan ? (
        <div
          className="rounded-2xl border border-dashed border-white/20 p-10 text-center text-blue-100/70"
          data-testid="empty-week"
        >
          No plan for this week yet. Press <strong>Generate week</strong> and TrainPlan will build one from your goal.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7" data-testid="week-grid">
          {WEEKDAYS.map((day) => {
            const isAvailable = props.goal.availableDays.includes(day) || props.goal.fixedCommitment?.day === day;
            return (
              <section
                key={day}
                data-testid={`day-${day}`}
                className={cn(
                  "flex min-h-40 flex-col gap-2 rounded-xl border p-2",
                  day === props.today ? "border-purple-300/60 bg-white/10" : "border-white/10 bg-white/5",
                  !isAvailable && "opacity-60",
                )}
              >
                <header className="flex items-center justify-between text-xs tracking-wide text-blue-100/70 uppercase">
                  <span>{WEEKDAY_LABELS[day]}</span>
                  {day === props.today && <span className="text-purple-200">today</span>}
                </header>
                {sessionsByDay(day).map((s) =>
                  editing === s.id ? (
                    <SessionForm
                      key={s.id}
                      initial={s}
                      submitLabel="Save"
                      onSubmit={saveEdit(s)}
                      onCancel={() => {
                        setEditing(null);
                      }}
                    />
                  ) : (
                    <SessionCard
                      key={s.id}
                      session={s}
                      busy={busy === s.id}
                      onStatus={(status) => setStatus(s, status)}
                      onEdit={() => {
                        setEditing(s.id);
                      }}
                      onDelete={() => remove(s)}
                    />
                  ),
                )}
                {adding === day ? (
                  <SessionForm
                    initial={{ day }}
                    submitLabel="Add"
                    onSubmit={saveNew}
                    onCancel={() => {
                      setAdding(null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(day);
                    }}
                    className="mt-auto rounded-md border border-dashed border-white/20 px-2 py-1 text-xs text-blue-100/60 hover:bg-white/10 hover:text-white"
                    data-testid={`add-session-${day}`}
                  >
                    + add session
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface CardProps {
  session: Session;
  busy: boolean;
  onStatus: (status: Session["status"]) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SessionCard({ session: s, busy, onStatus, onEdit, onDelete }: CardProps) {
  return (
    <article
      data-testid="session-card"
      data-status={s.status}
      className={cn(
        "rounded-lg border p-2 text-sm",
        intensityStyle[s.intensity],
        s.status === "done" && "opacity-70 ring-1 ring-emerald-300/60",
        s.status === "skipped" && "line-through opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div>
          <p className="font-medium capitalize">
            {s.type.replace("_", " ")} · {s.intensity}
          </p>
          <p className="text-xs opacity-80">
            {s.muscleGroups.join(", ")} · {s.durationMin} min{s.locked && " · fixed"}
          </p>
        </div>
        {!s.locked && (
          <div className="flex gap-1 text-xs opacity-80">
            <button type="button" onClick={onEdit} aria-label="Edit session" className="hover:underline">
              edit
            </button>
            <button type="button" onClick={onDelete} aria-label="Delete session" className="hover:underline">
              del
            </button>
          </div>
        )}
      </div>
      {s.description && <p className="mt-1 text-xs opacity-90">{s.description}</p>}
      <div className="mt-2 flex flex-wrap gap-1">
        {s.status === "planned" ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onStatus("done");
              }}
              className="rounded-md bg-emerald-500/40 px-2 py-0.5 text-xs hover:bg-emerald-500/60"
            >
              Done
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onStatus("skipped");
              }}
              className="rounded-md bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20"
            >
              Skip
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              onStatus("planned");
            }}
            className="rounded-md bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20"
          >
            Undo {s.status}
          </button>
        )}
      </div>
    </article>
  );
}
