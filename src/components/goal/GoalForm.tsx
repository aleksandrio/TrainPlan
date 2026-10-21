import { useState } from "react";
import type { Goal, Level, Weekday } from "@/types";
import { WEEKDAY_LABELS, WEEKDAYS } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  initial: Goal | null;
}

const LEVELS: { value: Level; label: string; hint: string }[] = [
  { value: "beginner", label: "Beginner", hint: "under a year of regular training" },
  { value: "intermediate", label: "Intermediate", hint: "1-3 years, trains 3-4x a week" },
  { value: "advanced", label: "Advanced", hint: "3+ years, tolerates high load" },
];

const inputClass =
  "w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:ring-2 focus:ring-purple-400 focus:outline-none";

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
    <form onSubmit={handleSubmit} className="space-y-6" noValidate data-testid="goal-form">
      <div>
        <label htmlFor="goalText" className="mb-1 block text-sm text-blue-100/80">
          What do you want to achieve?
        </label>
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
      </div>

      <fieldset>
        <legend className="mb-2 text-sm text-blue-100/80">Level</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {LEVELS.map((l) => (
            <label
              key={l.value}
              className={cn(
                "cursor-pointer rounded-lg border px-3 py-2 text-sm",
                level === l.value
                  ? "border-purple-300 bg-purple-500/20"
                  : "border-white/15 bg-white/5 hover:bg-white/10",
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
                className="mr-2"
              />
              <span className="font-medium">{l.label}</span>
              <span className="block text-xs text-blue-100/60">{l.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm text-blue-100/80">Days you can train</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => (
            <label
              key={d}
              className={cn(
                "cursor-pointer rounded-lg border px-3 py-1.5 text-sm",
                days.includes(d) ? "border-blue-300 bg-blue-500/25" : "border-white/15 bg-white/5 hover:bg-white/10",
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
      </fieldset>

      <fieldset className="space-y-3">
        <label className="flex items-center gap-2 text-sm text-blue-100/80">
          <input
            type="checkbox"
            name="hasCommitment"
            checked={hasCommitment}
            onChange={(e) => {
              setHasCommitment(e.target.checked);
            }}
          />
          I have a fixed weekly activity (team sport, class, match)
        </label>
        {hasCommitment && (
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
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
                <option key={d} value={d} className="text-black">
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
        <p className="text-xs text-blue-100/50">
          The day before is kept light, and the activity counts as a heavy legs + cardio session.
        </p>
      </fieldset>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm text-blue-100/80">
          Notes (injuries, equipment, preferences)
        </label>
        <textarea
          id="notes"
          name="notes"
          className={inputClass}
          rows={3}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
          }}
          maxLength={1000}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-5 py-2 font-medium text-white shadow transition hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Saving…" : initial ? "Save changes" : "Save goal"}
      </button>
    </form>
  );
}
