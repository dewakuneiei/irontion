// Reminders (F008): quick times, and moving between the local time the user picks and the UTC
// time the backend stores. Pure functions: pass `now`, so they are easy to test.

import type { Note } from "$lib/api/types";
import { toISODate } from "./time";

export const REMINDER_PRESETS = ["inOneHour", "tomorrow", "nextWeek"] as const;
export type ReminderPreset = (typeof REMINDER_PRESETS)[number];

/** The hour "tomorrow" and "next week" remind at, local time. */
export const MORNING_HOUR = 9;

/** The local time a quick choice means. "In an hour" drops the seconds; "next week" is the coming Monday. */
export function presetTime(preset: ReminderPreset, now: Date): Date {
  if (preset === "inOneHour") {
    const at = new Date(now.getTime() + 3_600_000);
    at.setSeconds(0, 0);
    return at;
  }
  const days = preset === "tomorrow" ? 1 : ((8 - now.getDay()) % 7 || 7);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, MORNING_HOUR, 0, 0, 0);
}

/** What the backend stores: UTC, ISO 8601, with milliseconds. */
export function toUtc(date: Date): string {
  return date.toISOString();
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A stored UTC time as the user's local day (`YYYY-MM-DD`) and clock (`HH:MM`, 24-hour). */
export function localParts(utc: string): { date: string; time: string } {
  const at = new Date(utc);
  return { date: toISODate(at), time: `${pad(at.getHours())}:${pad(at.getMinutes())}` };
}

/** The local moment of a day and a `HH:MM` clock, or `null` when the clock is not a real time. */
export function fromLocal(date: string, time: string): Date | null {
  const clock = /^(\d{2}):(\d{2})$/.exec(time);
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!clock || !day) return null;
  const [hour, minute] = [Number(clock[1]), Number(clock[2])];
  if (hour > 23 || minute > 59) return null;
  const at = new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]), hour, minute, 0, 0);
  return Number.isNaN(at.getTime()) ? null : at;
}

export type ReminderState = "none" | "upcoming" | "past";

export function reminderState(note: Pick<Note, "remindAt">, now: Date): ReminderState {
  if (note.remindAt === null) return "none";
  return new Date(note.remindAt).getTime() <= now.getTime() ? "past" : "upcoming";
}

/** Notes with a reminder, split: still to come (soonest first) and already past (latest first). */
export function splitReminders(notes: readonly Note[], now: Date): { upcoming: Note[]; past: Note[] } {
  const timed = notes.filter((n) => n.remindAt !== null);
  const at = (n: Note) => new Date(n.remindAt!).getTime();
  return {
    upcoming: timed.filter((n) => reminderState(n, now) === "upcoming").sort((a, b) => at(a) - at(b) || a.id - b.id),
    past: timed.filter((n) => reminderState(n, now) === "past").sort((a, b) => at(b) - at(a) || b.id - a.id),
  };
}
