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

  // A season that wraps past December (e.g. closed only in August reads as "Sep–Jul") is
  // still one contiguous run, so each month is compared against its CIRCULAR predecessor —
  // that makes the Dec→Jan step consecutive rather than a gap. Exactly one break means a
  // single run, wrapping or not; none means all 12 months.
  const breaks: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const prev = sorted[(i - 1 + sorted.length) % sorted.length];
    if (sorted[i] !== (prev % 12) + 1) breaks.push(i);
  }

  if (breaks.length <= 1) {
    const startIdx = breaks[0] ?? 0;
    const start = sorted[startIdx];
    const end = sorted[(startIdx - 1 + sorted.length) % sorted.length];
    return start === end
      ? MONTH_ABBR[start - 1]
      : `${MONTH_ABBR[start - 1]}–${MONTH_ABBR[end - 1]}`;
  }

  return sorted.map((m) => MONTH_ABBR[m - 1]).join(", ");
}
