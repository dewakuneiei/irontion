// The clock dial of the time picker: which number is where, and which number a pointer is on.
// Pure geometry on "dial values" (what the dial shows): 1-12 on a 12-hour dial, 0-23 on a 24-hour
// dial (outer ring 1-12, inner ring 00 and 13-23), 0-59 on the minute dial. No I/O, no Svelte.

import type { TimeFormat } from "./datetime";

export type DialMode = "hour" | "minute";

/** One number printed on the dial. `angle` is clockwise from the top, in degrees. */
export interface DialMark {
  value: number;
  label: string;
  angle: number;
  inner: boolean;
}

/** Where the inner ring of the 24-hour dial begins, as a share of the dial's radius. */
export const INNER_RING_LIMIT = 0.67;

const pad = (n: number) => String(n).padStart(2, "0");

/** `HH:MM` (24-hour) as numbers, or `null` when it is not a real time. */
export function parseClock(time: string): { hour: number; minute: number } | null {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) return null;
  const [hour, minute] = [Number(m[1]), Number(m[2])];
  return hour > 23 || minute > 59 ? null : { hour, minute };
}

export function joinClock(hour: number, minute: number): string {
  return `${pad(hour)}:${pad(minute)}`;
}

/** The 12-hour clock's hour (1-12) and whether it is the afternoon. */
export function to12(hour: number): { hour12: number; pm: boolean } {
  return { hour12: hour % 12 === 0 ? 12 : hour % 12, pm: hour >= 12 };
}

export function from12(hour12: number, pm: boolean): number {
  return (hour12 % 12) + (pm ? 12 : 0);
}

/** Degrees clockwise from the top (0-360) of a point `dx` right and `dy` down of the center. */
export function angleFromPoint(dx: number, dy: number): number {
  return (((Math.atan2(dx, -dy) * 180) / Math.PI) + 360) % 360;
}

/** The nearest of `steps` equal steps around the dial; step 0 is the top. */
function stepFromAngle(angle: number, steps: number): number {
  return Math.round(angle / (360 / steps)) % steps;
}

/** The numbers printed on the dial, with the 12 (or 00) at the top. */
export function dialMarks(mode: DialMode, format: TimeFormat): DialMark[] {
  if (mode === "minute") {
    return Array.from({ length: 12 }, (_, i) => ({ value: i * 5, label: pad(i * 5), angle: i * 30, inner: false }));
  }
  const outer = Array.from({ length: 12 }, (_, i) => {
    const value = i === 0 ? 12 : i;
    return { value, label: String(value), angle: i * 30, inner: false };
  });
  if (format === "12h") return outer;
  const inner = Array.from({ length: 12 }, (_, i) => {
    const value = i === 0 ? 0 : i + 12;
    return { value, label: pad(value), angle: i * 30, inner: true };
  });
  return [...outer, ...inner];
}

/** The value a pointer chose: `dx`, `dy` from the dial's center, on a dial of this `radius`. */
export function valueAtPoint(mode: DialMode, format: TimeFormat, dx: number, dy: number, radius: number): number {
  const angle = angleFromPoint(dx, dy);
  if (mode === "minute") return stepFromAngle(angle, 60);
  const step = stepFromAngle(angle, 12);
  const inner = format === "24h" && Math.hypot(dx, dy) < radius * INNER_RING_LIMIT;
  if (inner) return step === 0 ? 0 : step + 12;
  return step === 0 ? 12 : step;
}

/** The dial value for a time: what the hand points at. */
export function dialValue(mode: DialMode, format: TimeFormat, hour: number, minute: number): number {
  if (mode === "minute") return minute;
  return format === "12h" ? to12(hour).hour12 : hour;
}

/** The hour (0-23) after choosing `value` on the hour dial, keeping the morning or afternoon of a 12-hour dial. */
export function hourFromDial(format: TimeFormat, value: number, current: number): number {
  return format === "24h" ? value : from12(value, to12(current).pm);
}

/** Where the hand points, and whether it reaches only the inner ring. */
export function handOf(mode: DialMode, format: TimeFormat, value: number): { angle: number; inner: boolean } {
  if (mode === "minute") return { angle: value * 6, inner: false };
  return { angle: (value % 12) * 30, inner: format === "24h" && (value === 0 || value > 12) };
}

/** The next value after arrow keys: one step, wrapping around the dial. */
export function stepValue(mode: DialMode, format: TimeFormat, value: number, delta: number): number {
  if (mode === "minute") return (value + delta + 60) % 60;
  if (format === "24h") return (value + delta + 24) % 24;
  return ((value - 1 + delta + 12) % 12) + 1;
}
