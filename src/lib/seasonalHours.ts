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

/** Derives the set of whole months (1–12) touched by a single [start, end] range,
 *  inclusive of any month it only partially covers, handling New-Year wraparound. */
function monthsInRange(start: MonthDay, end: MonthDay): number[] {
  const months: number[] = [];
  let m = start.month;
  // Safety cap of 12 iterations — a range can touch at most all 12 months.
  for (let i = 0; i < 12; i++) {
    months.push(m);
    if (m === end.month) break;
    m = m === 12 ? 1 : m + 1;
  }
  return months;
}

/** Derives `openingMonths` (whole months the attraction is open in) as the union of every
 *  seasonal-hours entry's date range. Once any seasonal-hours entry exists, this is the
 *  ONLY source of `openingMonths` — it is never independently set by the user (the
 *  Opening Months toggle/grid is hidden in the form in that case) and never falls back to
 *  a manually-picked month set, matching `resolveOpeningHoursForDate`'s "no default once
 *  seasonal hours exist" rule. */
export function deriveOpeningMonthsFromSeasonalHours(entries: SeasonalHoursEntry[]): number[] {
  const months = new Set<number>();
  for (const entry of entries) {
    for (const m of monthsInRange(entry.start, entry.end)) months.add(m);
  }
  return [...months].sort((a, b) => a - b);
}

/** Picks whichever `seasonalHours` entry's date range contains `date`. The base
 *  `openingHours` is used ONLY when there are no seasonal entries at all — once any
 *  seasonal-hours entry exists, the base schedule is never used as a fallback, even for a
 *  date that falls outside every defined range (returns `undefined` in that case, meaning
 *  "no defined hours for this date" rather than silently applying the base schedule).
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
    return seasonalHours.find((entry) => isMonthDayInRange(point, entry.start, entry.end))?.hours;
  }
  return baseHours;
}
