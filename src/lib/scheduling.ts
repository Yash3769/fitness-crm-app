import { DAYS } from "./domain";
import type { WorkoutPlanContent } from "./plan-types";

export type SessionInsert = {
  plan_id: string;
  client_id: string;
  scheduled_date: string;
  week_number: number;
  phase_index: number;
  day_index: number;
  day_label: string;
  focus: string;
};

const DEFAULT_SPREAD = ["Mon", "Wed", "Fri", "Tue", "Thu", "Sat", "Sun"];

export function parseWeeks(duration: string | undefined, fallback = 4): number {
  const m = /(\d+)\s*(week|wk)/i.exec(duration ?? "");
  if (m) return Math.max(1, Math.min(52, Number(m[1])));
  const d = /(\d+)\s*day/i.exec(duration ?? "");
  if (d) return Math.max(1, Math.ceil(Number(d[1]) / 7));
  return fallback;
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Picks a weekday (Mon..Sun) for each training day, honouring the client's preferred days first. */
export function assignWeekdays(count: number, preferred: string[]): string[] {
  const clean = preferred.filter((d) => (DAYS as readonly string[]).includes(d));
  const ordered = [...clean, ...DEFAULT_SPREAD.filter((d) => !clean.includes(d))];
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(ordered[i % ordered.length]!);
  return out;
}

/**
 * Expands a plan's phases into dated sessions. Each "week" starts on the start date, and every
 * training day lands on the first matching weekday inside that 7-day window.
 */
export function buildSessions(
  planId: string,
  clientId: string,
  content: WorkoutPlanContent,
  startDate: Date,
  preferredDays: string[],
): { rows: SessionInsert[]; endDate: string | null } {
  const rows: SessionInsert[] = [];
  let weekNumber = 0;
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  (content.phases ?? []).forEach((phase, phaseIndex) => {
    const weeks = parseWeeks(phase.duration);
    const days = phase.days ?? [];
    if (!days.length) return;
    const weekdays = assignWeekdays(days.length, preferredDays);

    for (let w = 0; w < weeks; w++) {
      weekNumber += 1;
      const windowStart = new Date(start);
      windowStart.setDate(start.getDate() + (weekNumber - 1) * 7);

      days.forEach((day, dayIndex) => {
        const label = weekdays[dayIndex]!;
        const wanted = (DAYS.indexOf(label as (typeof DAYS)[number]) + 1) % 7; // JS: Sun=0
        const date = new Date(windowStart);
        for (let k = 0; k < 7; k++) {
          if (date.getDay() === wanted) break;
          date.setDate(date.getDate() + 1);
        }
        rows.push({
          plan_id: planId,
          client_id: clientId,
          scheduled_date: isoDate(date),
          week_number: weekNumber,
          phase_index: phaseIndex,
          day_index: dayIndex,
          day_label: day.day || `Day ${dayIndex + 1}`,
          focus: day.focus || "",
        });
      });
    }
  });

  rows.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  return { rows, endDate: rows.length ? rows[rows.length - 1]!.scheduled_date : null };
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, opts);
}

export function todayIso(): string {
  return isoDate(new Date());
}
