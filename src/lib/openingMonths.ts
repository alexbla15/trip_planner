export const ALL_MONTHS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
