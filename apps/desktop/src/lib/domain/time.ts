/** Ten-minute cells in a day: 24 rows of 6. Mirrors `irontion_core::SLOTS_PER_DAY`. */
export const SLOTS_PER_DAY = 144;
export const SLOTS_PER_HOUR = 6;
export const SLOT_MINUTES = 10;
export const HOURS = 24;

/** Slot that contains the given time. */
export function slotAt(date: Date): number {
  return Math.floor((date.getHours() * 60 + date.getMinutes()) / SLOT_MINUTES);
}

/** How much of a day has passed, for drawing the grid. */
export interface DayProgress {
  /** Slots that have fully passed: all 144 for a past day, none for a future day. */
  elapsed: number;
  /** How far through the current slot we are, 0 to 1. Only meaningful when `isToday`. */
  progress: number;
  isToday: boolean;
}

/** Past slots are filled, future ones hollow, and the current one fills as its ten minutes go by. */
export function dayProgress(date: string, now: Date): DayProgress {
  const today = toISODate(now);
  if (date < today) return { elapsed: SLOTS_PER_DAY, progress: 0, isToday: false };
  if (date > today) return { elapsed: 0, progress: 0, isToday: false };
  const seconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const slotSeconds = SLOT_MINUTES * 60;
  return { elapsed: Math.floor(seconds / slotSeconds), progress: (seconds % slotSeconds) / slotSeconds, isToday: true };
}

// ---------- Dates as local "YYYY-MM-DD" strings ----------

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const date = fromISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

