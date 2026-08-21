// Distinct, evenly-spaced hues used to color-code a trip's days (Explore tab day
// picker + map markers) — cycles if a trip somehow has more days than colors.
export const DAY_COLOR_PALETTE = [
  "#2563EB", // blue
  "#DC2626", // red
  "#059669", // green
  "#D97706", // amber
  "#7C3AED", // violet
  "#DB2777", // pink
  "#0891B2", // cyan
  "#65A30D", // lime
  "#EA580C", // orange
  "#4F46E5", // indigo
];

// Neutral color for attractions with no planned date — distinguishable from every
// palette entry, matches the existing default marker/type-badge fallback color.
export const UNSCHEDULED_DAY_COLOR = "#64748B";

/** Maps each trip day key (in order) to a palette color. */
export function buildDayColorMap(dayKeys: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  dayKeys.forEach((key, i) => {
    map[key] = DAY_COLOR_PALETTE[i % DAY_COLOR_PALETTE.length];
  });
  return map;
}
