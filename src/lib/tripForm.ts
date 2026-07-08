/** Shared constants and pure utilities used by both NewTripClient and EditTripClient. */

export type { Currency } from "./currencies";
export { CURRENCIES } from "./currencies";

/** Maximum character count for trip notes. */
export const NOTES_MAX = 500;

/**
 * Returns the inclusive number of days between two ISO date strings.
 * Returns null if either input is missing or invalid, or if end < start.
 */
export function getDurationDays(start: string, end: string): number | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  const days = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return days >= 0 ? days + 1 : null;
}

/** Returns a user-facing error message when end < start, otherwise null. */
export function getDateError(start: string, end: string): string | null {
  if (!start || !end) return null;
  if (new Date(end) < new Date(start)) return "End date must be on or after start date";
  return null;
}

/**
 * Returns a semantic warning level for the notes character counter.
 * Components map this to their own CSS classes.
 *   "warn"  → approaching the limit (within 50 chars)
 *   "error" → at or over the limit
 */
export function getNotesCountLevel(count: number, max: number): "ok" | "warn" | "error" {
  if (count >= max) return "error";
  if (count >= max - 50) return "warn";
  return "ok";
}
