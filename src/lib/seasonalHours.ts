import type { OpeningHours } from "@/types/attraction";

export interface MonthDay {
  month: number; // 1–12
  day: number;   // 1–31
}

export interface SeasonalHoursEntry {
  start: MonthDay;
  end: MonthDay;
  hours: OpeningHours;
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Not leap-year-aware — these ranges are recurring/annual (no specific year attached), so
// Feb is always treated as 29 days to avoid rejecting "Feb 29" as a valid endpoint.
const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function monthDayToOrdinal({ month, day }: MonthDay): number {
  let ordinal = day;
  for (let m = 1; m < month; m++) ordinal += MONTH_DAYS[m - 1];
  return ordinal;
}

/** True when `point` falls within the [start, end] range, correctly handling a range that
 *  wraps across the New Year boundary (e.g. Nov 1 – Feb 28). */
export function isMonthDayInRange(point: MonthDay, start: MonthDay, end: MonthDay): boolean {
  const p = monthDayToOrdinal(point);
  const s = monthDayToOrdinal(start);
  const e = monthDayToOrdinal(end);
  return s <= e ? p >= s && p <= e : p >= s || p <= e;
}

/** Formats a date range for display, e.g. "Mar 15 – Oct 1". */
export function formatSeasonalRangeLabel(start: MonthDay, end: MonthDay): string {
  return `${MONTH_ABBR[start.month - 1]} ${start.day} – ${MONTH_ABBR[end.month - 1]} ${end.day}`;
}

/** Picks whichever `seasonalHours` entry's date range contains `date`, falling back to the
 *  attraction's base `openingHours` when none match (or no seasonal entries exist at all).
 *  When two entries' ranges overlap and both contain `date`, the first one wins (entries
 *  are user-ordered; earlier entries take priority — same "first match wins" rule as the
 *  form's own display order). */
export function resolveOpeningHoursForDate(
  baseHours: OpeningHours | undefined,
  seasonalHours: SeasonalHoursEntry[] | undefined,
  date: Date
): OpeningHours | undefined {
  if (seasonalHours?.length) {
    const point: MonthDay = { month: date.getUTCMonth() + 1, day: date.getUTCDate() };
    const match = seasonalHours.find((entry) => isMonthDayInRange(point, entry.start, entry.end));
    if (match) return match.hours;
  }
  return baseHours;
}
