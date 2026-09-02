export const ALL_MONTHS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface MonthDay {
  month: number; // 1–12
  day: number;   // 1–31
}

/** Days per month for range math — not leap-year-aware since seasonal ranges are
 *  recurring/annual (no specific year), so Feb is always treated as 29 days to avoid
 *  rejecting "Feb 29" as an endpoint in a non-leap comparison year. */
const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Compares two month/day points within a single (non-wrapping) calendar year. */
function monthDayToOrdinal({ month, day }: MonthDay): number {
  let ordinal = day;
  for (let m = 1; m < month; m++) ordinal += MONTH_DAYS[m - 1];
  return ordinal;
}

/** True when `point` falls within the [start, end] range, correctly handling a range
 *  that wraps across the New Year boundary (e.g. Nov 1 – Feb 28). */
export function isMonthDayInRange(point: MonthDay, start: MonthDay, end: MonthDay): boolean {
  const p = monthDayToOrdinal(point);
  const s = monthDayToOrdinal(start);
  const e = monthDayToOrdinal(end);
  return s <= e ? p >= s && p <= e : p >= s || p <= e;
}

/** Derives the set of whole months touched by a [start, end] day-level range (inclusive
 *  of any month the range partially covers), handling New-Year wraparound. Used to keep
 *  legacy `openingMonths`-based consumers (status chips, coarse checks) working without
 *  modification once a precise `seasonalStart`/`seasonalEnd` range is set. */
export function deriveOpeningMonthsFromRange(start: MonthDay, end: MonthDay): number[] {
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

/** Formats a precise seasonal range for display, e.g. "Mar 15 – Oct 1". */
export function formatSeasonalRangeLabel(start: MonthDay, end: MonthDay): string {
  return `${MONTH_ABBR[start.month - 1]} ${start.day} – ${MONTH_ABBR[end.month - 1]} ${end.day}`;
}

/** True when `openingMonths` is absent, empty, or covers all 12 months — the default,
 *  "open year-round" state. Absence must read as year-round (not "no months selected"),
 *  since existing attractions in the DB predate this field entirely. */
export function isYearRound(openingMonths: number[] | undefined | null): boolean {
  if (!openingMonths || openingMonths.length === 0) return true;
  const set = new Set(openingMonths);
  return ALL_MONTHS.every((m) => set.has(m));
}

/** Formats a set of open months for display, e.g. "Mar–Oct" for a contiguous run, or a
 *  comma list ("Jan, Jul, Aug") for a non-contiguous set. Assumes `openingMonths` is
 *  already known to be non-year-round (callers check `isYearRound` first). */
export function formatOpeningMonthsLabel(openingMonths: number[]): string {
  const sorted = [...new Set(openingMonths)].sort((a, b) => a - b);
  if (sorted.length === 0) return "Seasonal";

  const isConsecutive = sorted.every((m, i) => i === 0 || m === sorted[i - 1] + 1);
  if (isConsecutive) {
    return sorted.length === 1
      ? MONTH_ABBR[sorted[0] - 1]
      : `${MONTH_ABBR[sorted[0] - 1]}–${MONTH_ABBR[sorted[sorted.length - 1] - 1]}`;
  }

  return sorted.map((m) => MONTH_ABBR[m - 1]).join(", ");
}
