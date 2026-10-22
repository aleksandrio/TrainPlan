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

/** Left edge of a session card encodes intensity: grey light, white moderate, red heavy. */
const intensityEdge: Record<Session["intensity"], string> = {
  light: "border-l-line-strong",
  moderate: "border-l-foreground",
  heavy: "border-l-primary",
};

const changeGlyph: Record<ReplanChange["action"], string> = { moved: "➜", dropped: "✕", kept: "•" };

const MS_PER_DAY = 86_400_000;
const dayFmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
const numFmt = new Intl.DateTimeFormat("en", { day: "2-digit" });

function weekDates(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 6 * MS_PER_DAY);
  return {
    range: `${dayFmt.format(start)} - ${dayFmt.format(end)}`,
    dayNumber: (day: Weekday) => numFmt.format(new Date(start.getTime() + day * MS_PER_DAY)),
  };
}

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

  const dates = weekDates(props.weekStart);

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
  const doneCount = plan?.sessions.filter((s) => s.status === "done").length ?? 0;
  const generating = busy === "generate";

  return (
    <div className="corner-marks border-border border" data-testid="week-planner">
      {/* Header: week title, goal summary, stats, primary action */}
      <div className="border-border grid gap-6 border-b px-5 py-6 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="min-w-0">
          <span className="label text-accent-ink">Week of {dates?.range ?? props.weekStart}</span>
          <h1 className="mt-1 text-4xl sm:text-5xl">Your week</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {props.goal.goalText} · {props.goal.level}
            {props.goal.fixedCommitment &&
              ` · ${props.goal.fixedCommitment.label} on ${WEEKDAY_LABELS[props.goal.fixedCommitment.day]}`}
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          {validation && (
            <dl className="border-border bg-border flex gap-px border" data-testid="validity-badge">
              <div
                className={cn(
                  "bg-background flex min-w-[6.5rem] flex-col gap-1 px-4 py-2.5",
                  validation.valid ? "text-ok" : "text-accent-ink",
                )}
              >
                <dt className="label text-muted-foreground">Status</dt>
                <dd className="font-display text-2xl leading-none">
                  {validation.valid ? "Valid week" : `${validation.violations.length} rule issue(s)`}
                </dd>
              </div>
              <div className="bg-background flex min-w-[6.5rem] flex-col gap-1 px-4 py-2.5">
                <dt className="label text-muted-foreground">Load</dt>
                <dd className="font-display text-foreground text-2xl leading-none tabular-nums">
                  {validation.load}
                  <span className="label text-muted-foreground ml-1">/{validation.limit}</span>
                </dd>
                <div className="bg-border h-0.5" aria-hidden="true">
                  <div
                    className={cn("h-full", validation.load > validation.limit ? "bg-primary" : "bg-foreground")}
                    style={{ width: `${Math.min(100, (validation.load / validation.limit) * 100)}%` }}
                  />
                </div>
              </div>
              {plan && (
                <div className="bg-background flex min-w-[6.5rem] flex-col gap-1 px-4 py-2.5">
                  <dt className="label text-muted-foreground">Sessions</dt>
                  <dd className="font-display text-foreground text-2xl leading-none tabular-nums">
                    {plan.sessions.length}
                    <span className="label text-muted-foreground ml-1">· {doneCount} done</span>
                  </dd>
                </div>
              )}
            </dl>
          )}
          <button
            type="button"
            onClick={generate}
            disabled={busy !== null}
            data-testid="generate-button"
            className={cn(
              "inline-flex items-center justify-center gap-2 border px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-60",
              plan
                ? "border-line-strong text-foreground hover:bg-secondary"
                : "border-primary bg-primary text-white hover:opacity-90",
            )}
          >
            {generating ? (
              <>
                <span className="size-3 animate-spin rounded-full border border-white/40 border-t-white" aria-hidden />
                Preparing your week…
              </>
            ) : plan ? (
              "Regenerate week"
            ) : (
              "Generate week"
            )}
          </button>
        </div>
      </div>

      {/* Alert band: generation note, errors, violations, re-plan summary and proposal */}
      {generating ||
      error ||
      note ||
      proposal ||
      (lastChanges && lastChanges.length > 0) ||
      validation?.violations.length ? (
        <div className="border-border flex flex-col gap-2 border-b px-5 py-3 sm:px-6">
          {generating && (
            <p role="status" className="text-muted-foreground text-sm">
              Drafting sessions and checking regeneration, weekly load and your fixed activity. This can take up to 20
              seconds.
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="border-primary text-accent-ink flex flex-wrap items-center justify-between gap-3 border px-3 py-2 text-sm"
            >
              <span>{error}</span>
              <button type="button" onClick={generate} className="label underline underline-offset-4">
                Retry
              </button>
            </div>
          )}

          {note && (
            <p className="border-warn/60 text-warn border px-3 py-2 text-sm" data-testid="generation-note">
              {note}
            </p>
          )}

          {validation && validation.violations.length > 0 && (
            <ul className="border-primary border text-sm" data-testid="violations">
              {validation.violations.map((v) => (
                <li
                  key={`${v.rule}-${v.days.join("-")}-${v.message}`}
                  className="border-primary/40 grid gap-x-4 gap-y-1 border-b px-3 py-2 last:border-b-0 sm:grid-cols-[6rem_1fr_auto] sm:items-center"
                >
                  <span className="label text-accent-ink">Rule issue</span>
                  <span className="text-foreground">{v.message}</span>
                  <span className="label text-muted-foreground">{v.rule}</span>
                </li>
              ))}
            </ul>
          )}

          {lastChanges && lastChanges.length > 0 && (
            <div
              className="border-border grid gap-x-4 gap-y-1 border px-3 py-2 text-sm sm:grid-cols-[6rem_1fr]"
              data-testid="change-summary"
            >
              <span className="label text-muted-foreground">Re-planned</span>
              <ul className="text-ink-body flex flex-col gap-0.5">
                {lastChanges.map((c) => (
                  <li key={c.sessionId}>
                    <span className="text-muted-foreground mr-1.5">{changeGlyph[c.action]}</span>
                    {c.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {proposal && (
            <div
              role="dialog"
              aria-label="Re-plan proposal"
              className="border-foreground bg-card grid gap-x-4 gap-y-3 border px-3 py-3 text-sm sm:grid-cols-[6rem_1fr]"
              data-testid="replan-dialog"
            >
              <span className="label text-accent-ink">Re-plan</span>
              <div className="flex flex-col gap-3">
                <p className="text-foreground">You skipped a session. Here is how the rest of the week could change:</p>
                <ul className="text-ink-body flex flex-col gap-0.5">
                  {proposal.proposal.changes.map((c) => (
                    <li key={c.sessionId}>
                      <span className="text-muted-foreground mr-1.5">{changeGlyph[c.action]}</span>
                      {c.reason}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => acceptReplan(proposal.sessionId)}
                    disabled={busy !== null}
                    className="border-primary bg-primary border px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    data-testid="accept-replan"
                  >
                    Accept re-plan
                  </button>
                  <button
                    type="button"
                    onClick={() => keepWithoutReplan(proposal.sessionId)}
                    disabled={busy !== null}
                    className="border-line-strong text-foreground hover:bg-secondary border px-3 py-1.5 text-sm transition-colors disabled:opacity-60"
                    data-testid="keep-plan"
                  >
                    Just mark as skipped
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProposal(null);
                    }}
                    className="label text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Week grid */}
      {!plan ? (
        <div className="px-5 py-14 text-center sm:px-6" data-testid="empty-week">
          <span className="label text-accent-ink">Step 2</span>
          <h2 className="mt-3 mb-3 text-3xl">No plan for this week yet</h2>
          <p className="text-muted-foreground mx-auto max-w-[40ch] text-sm">
            Press <strong className="text-foreground font-medium">Generate week</strong> and TrainPlan will build one
            from your goal.
          </p>
        </div>
      ) : (
        <div className="bg-border grid gap-px sm:grid-cols-2 lg:grid-cols-7" data-testid="week-grid">
          {WEEKDAYS.map((day) => {
            const isAvailable = props.goal.availableDays.includes(day) || props.goal.fixedCommitment?.day === day;
            const isToday = day === props.today;
            return (
              <section
                key={day}
                data-testid={`day-${day}`}
                className={cn("bg-background flex min-h-56 min-w-0 flex-col", !isAvailable && "bg-hatch")}
              >
                <header
                  className={cn(
                    "flex items-baseline justify-between border-b px-3 py-2.5",
                    isToday ? "border-primary border-b-2" : "border-border",
                  )}
                >
                  <span className={cn("label", isToday ? "text-accent-ink" : "text-muted-foreground")}>
                    {WEEKDAY_LABELS[day]}
                    {isToday && " · today"}
                  </span>
                  {dates && (
                    <span className="font-display text-foreground text-xl leading-none tabular-nums">
                      {dates.dayNumber(day)}
                    </span>
                  )}
                </header>
                <div className="flex flex-1 flex-col gap-2 p-2">
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
                  {sessionsByDay(day).length === 0 && adding !== day && (
                    <p className="label text-line-strong py-4 text-center">Rest</p>
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
                      className="label border-border text-muted-foreground hover:border-line-strong hover:text-foreground mt-auto border border-dashed px-2 py-2 transition-colors"
                      data-testid={`add-session-${day}`}
                    >
                      + add session
                    </button>
                  )}
                </div>
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

const smallBtn =
  "label border border-line-strong px-2 py-1 text-ink-body transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50";

function SessionCard({ session: s, busy, onStatus, onEdit, onDelete }: CardProps) {
  return (
    <article
      data-testid="session-card"
      data-status={s.status}
      className={cn(
        "border-border bg-card flex flex-col gap-1.5 border border-l-[3px] p-2.5 text-sm",
        intensityEdge[s.intensity],
        s.locked && "border-dashed [border-left-style:solid]",
        s.status === "done" && "border-l-ok",
        s.status === "skipped" && "opacity-50",
      )}
    >
      <div className="label text-muted-foreground flex items-start justify-between gap-2">
        <span className="text-foreground">{s.type.replace("_", " ")}</span>
        <span className={cn(s.intensity === "heavy" && "text-accent-ink")}>{s.intensity}</span>
      </div>
      <p
        className={cn("text-foreground text-[13px] leading-snug font-medium", s.status === "skipped" && "line-through")}
      >
        {s.status === "done" && <span className="text-ok mr-1">✓</span>}
        {s.description || `${s.type.replace("_", " ")} session`}
      </p>
      <p className="text-muted-foreground text-xs">
        {s.muscleGroups.join(", ")} · {s.durationMin} min{s.locked && " · fixed"}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {s.status === "planned" ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onStatus("done");
              }}
              className={cn(smallBtn, "border-ok text-ok hover:text-ok")}
            >
              Done
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onStatus("skipped");
              }}
              className={smallBtn}
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
            className={smallBtn}
          >
            Undo {s.status}
          </button>
        )}
        {!s.locked && (
          <span className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit session"
              className="label text-muted-foreground hover:text-foreground transition-colors"
            >
              edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete session"
              className="label text-muted-foreground hover:text-accent-ink transition-colors"
            >
              del
            </button>
          </span>
        )}
      </div>
    </article>
  );
}
