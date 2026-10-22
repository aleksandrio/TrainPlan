import { useId, useState, type ReactNode } from "react";
import type { Goal, Level, Weekday } from "@/types";
import { WEEKDAY_LABELS, WEEKDAYS } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  initial: Goal | null;
}

const LEVELS: { value: Level; label: string; hint: string; cap: number }[] = [
  { value: "beginner", label: "Beginner", hint: "under a year of regular training", cap: 16 },
  { value: "intermediate", label: "Intermediate", hint: "1-3 years, trains 3-4x a week", cap: 24 },
  { value: "advanced", label: "Advanced", hint: "3+ years, tolerates high load", cap: 32 },
];

const inputClass =
  "w-full border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-foreground focus:ring-1 focus:ring-foreground focus:outline-none";

interface RowProps {
  label: ReactNode;
  /** Id of the single control this row labels. Omit for a group of controls. */
  htmlFor?: string;
  children: ReactNode;
}

function Row({ label, htmlFor, children }: RowProps) {
  const id = useId();
  return (
    <div className="border-border grid gap-2 border-b px-5 py-5 sm:grid-cols-[160px_1fr] sm:gap-6 sm:px-6">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="label text-muted-foreground sm:pt-3">
          {label}
        </label>
      ) : (
        <span id={id} className="label text-muted-foreground sm:pt-3">
          {label}
        </span>
      )}
      {htmlFor ? (
        <div className="min-w-0">{children}</div>
      ) : (
        <div role="group" aria-labelledby={id} className="min-w-0">
          {children}
        </div>
      )}
    </div>
  );
}

export default function GoalForm({ initial }: Props) {
  const [goalText, setGoalText] = useState(initial?.goalText ?? "");
  const [level, setLevel] = useState<Level>(initial?.level ?? "intermediate");
  const [days, setDays] = useState<Weekday[]>(initial?.availableDays ?? [1, 3, 5]);
  const [hasCommitment, setHasCommitment] = useState(Boolean(initial?.fixedCommitment));
  const [commitmentDay, setCommitmentDay] = useState<Weekday>(initial?.fixedCommitment?.day ?? 0);
  const [commitmentLabel, setCommitmentLabel] = useState(initial?.fixedCommitment?.label ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleDay(day: Weekday) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (goalText.trim().length < 3) {
      setError("Describe your goal in a few words.");
      return;
    }
    if (days.length === 0) {
      setError("Pick at least one training day.");
      return;
    }
    if (hasCommitment && commitmentLabel.trim().length === 0) {
      setError("Name your fixed activity.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalText: goalText.trim(),
          level,
          availableDays: days,
          fixedCommitment: hasCommitment ? { day: commitmentDay, label: commitmentLabel.trim() } : null,
          notes: notes.trim(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      window.location.assign("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the goal");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate data-testid="goal-form">
      <Row label="What do you want to achieve?" htmlFor="goalText">
        <input
          id="goalText"
          name="goalText"
          className={inputClass}
          value={goalText}
          onChange={(e) => {
            setGoalText(e.target.value);
          }}
          placeholder="Better conditioning and a higher jump for Monday volleyball"
          maxLength={500}
        />
        <p className="text-muted-foreground mt-2 text-xs">
          A sentence is enough. The planner reads it, the rules do the rest.
        </p>
      </Row>

      <Row label="Level">
        <div className="border-border bg-border grid gap-px border sm:grid-cols-3">
          {LEVELS.map((l) => (
            <label
              key={l.value}
              className={cn(
                "bg-background hover:bg-card flex cursor-pointer flex-col gap-1 p-3 transition-colors",
                level === l.value && "bg-surface-2 outline-foreground outline outline-1 -outline-offset-1",
              )}
            >
              <input
                type="radio"
                name="level"
                value={l.value}
                checked={level === l.value}
                onChange={() => {
                  setLevel(l.value);
                }}
                className="sr-only"
              />
              <span className="text-foreground text-sm font-medium">{l.label}</span>
              <span className="text-muted-foreground text-xs">{l.hint}</span>
              <span className="label text-muted-foreground">{l.cap} pts / week</span>
            </label>
          ))}
        </div>
      </Row>

      <Row label="Days you can train">
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((d) => (
            <label
              key={d}
              className={cn(
                "label cursor-pointer border px-3 py-2 transition-colors",
                days.includes(d)
                  ? "border-foreground bg-surface-2 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <input
                type="checkbox"
                name="availableDays"
                value={d}
                checked={days.includes(d)}
                onChange={() => {
                  toggleDay(d);
                }}
                className="sr-only"
              />
              {WEEKDAY_LABELS[d]}
            </label>
          ))}
        </div>
      </Row>

      <Row label="Fixed activity">
        <div className="flex flex-col gap-3">
          <label className="text-foreground flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              name="hasCommitment"
              checked={hasCommitment}
              onChange={(e) => {
                setHasCommitment(e.target.checked);
              }}
              className="size-4 accent-[var(--primary)]"
            />
            I have a fixed weekly activity (team sport, class, match)
          </label>
          {hasCommitment && (
            <div className="grid gap-2 sm:grid-cols-[130px_1fr]">
              <select
                name="commitmentDay"
                aria-label="Commitment day"
                className={inputClass}
                value={commitmentDay}
                onChange={(e) => {
                  setCommitmentDay(Number(e.target.value) as Weekday);
                }}
              >
                {WEEKDAYS.map((d) => (
                  <option key={d} value={d}>
                    {WEEKDAY_LABELS[d]}
                  </option>
                ))}
              </select>
              <input
                name="commitmentLabel"
                aria-label="Commitment name"
                className={inputClass}
                value={commitmentLabel}
                onChange={(e) => {
                  setCommitmentLabel(e.target.value);
                }}
                placeholder="Volleyball, 19:00"
                maxLength={100}
              />
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            The day before is kept light. The activity counts as a heavy legs + cardio session.
          </p>
        </div>
      </Row>

      <Row label="Notes" htmlFor="notes">
        <textarea
          id="notes"
          name="notes"
          className={inputClass}
          rows={3}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
          }}
          placeholder="Injuries, equipment, preferences"
          maxLength={1000}
        />
      </Row>

      <div className="flex flex-wrap items-center gap-4 px-5 py-5 sm:px-6">
        <button
          type="submit"
          disabled={saving}
          className="border-primary bg-primary inline-flex items-center border px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : initial ? "Save changes" : "Save goal"}
        </button>
        {error ? (
          <p role="alert" className="border-primary text-accent-ink border px-3 py-2 text-sm">
            {error}
          </p>
        ) : (
          <span className="label text-muted-foreground">Then one click on the week page</span>
        )}
      </div>
    </form>
  );
}
