import { useState } from "react";
import type { Intensity, MuscleGroup, Session, SessionType, Weekday } from "@/types";
import { INTENSITIES, MUSCLE_GROUPS, SESSION_TYPES, WEEKDAY_LABELS, WEEKDAYS } from "@/types";
import { cn } from "@/lib/utils";

export interface SessionFormValues {
  day: Weekday;
  type: SessionType;
  muscleGroups: MuscleGroup[];
  intensity: Intensity;
  durationMin: number;
  description: string;
}

interface Props {
  initial: Partial<Session> & { day: Weekday };
  onSubmit: (values: SessionFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

const inputClass =
  "w-full border border-border bg-background px-2 py-1.5 text-xs text-foreground transition-colors focus:border-foreground focus:ring-1 focus:ring-foreground focus:outline-none";

export function SessionForm({ initial, onSubmit, onCancel, submitLabel }: Props) {
  const [day, setDay] = useState<Weekday>(initial.day);
  const [type, setType] = useState<SessionType>(initial.type ?? "strength");
  const [groups, setGroups] = useState<MuscleGroup[]>(initial.muscleGroups ?? ["legs"]);
  const [intensity, setIntensity] = useState<Intensity>(initial.intensity ?? "moderate");
  const [durationMin, setDurationMin] = useState(initial.durationMin ?? 60);
  const [description, setDescription] = useState(initial.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (groups.length === 0) {
      setError("Pick at least one muscle group.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ day, type, muscleGroups: groups, intensity, durationMin, description: description.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="border-foreground bg-card flex flex-col gap-2 border p-2"
      data-testid="session-form"
    >
      <span className="label text-accent-ink">{initial.id ? "Edit session" : "New session"}</span>
      <div className="grid grid-cols-2 gap-1.5">
        <select
          aria-label="Day"
          className={inputClass}
          value={day}
          onChange={(e) => {
            setDay(Number(e.target.value) as Weekday);
          }}
        >
          {WEEKDAYS.map((d) => (
            <option key={d} value={d}>
              {WEEKDAY_LABELS[d]}
            </option>
          ))}
        </select>
        <select
          aria-label="Type"
          className={inputClass}
          value={type}
          onChange={(e) => {
            setType(e.target.value as SessionType);
          }}
        >
          {SESSION_TYPES.filter((t) => t !== "team_sport").map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          aria-label="Intensity"
          className={inputClass}
          value={intensity}
          onChange={(e) => {
            setIntensity(e.target.value as Intensity);
          }}
        >
          {INTENSITIES.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        <input
          aria-label="Duration (minutes)"
          type="number"
          min={10}
          max={240}
          step={5}
          className={inputClass}
          value={durationMin}
          onChange={(e) => {
            setDurationMin(Number(e.target.value));
          }}
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {MUSCLE_GROUPS.map((g) => (
          <label
            key={g}
            className={cn(
              "label cursor-pointer border px-2 py-1 transition-colors",
              groups.includes(g)
                ? "border-foreground bg-surface-2 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={groups.includes(g)}
              onChange={() => {
                setGroups((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
              }}
            />
            {g}
          </label>
        ))}
      </div>
      <textarea
        aria-label="Description"
        className={inputClass}
        rows={2}
        value={description}
        onChange={(e) => {
          setDescription(e.target.value);
        }}
        placeholder="What exactly will you do?"
      />
      {error && (
        <p role="alert" className="text-accent-ink text-xs">
          {error}
        </p>
      )}
      <div className="flex gap-1.5">
        <button
          type="submit"
          disabled={busy}
          className="label border-primary bg-primary border px-3 py-1.5 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="label border-line-strong text-foreground hover:bg-secondary border px-3 py-1.5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
