// Reuses the same hues already established for Mood Tag chips elsewhere in the app
// (docs/DESIGN_SYSTEM.md's Mood Tag Colors table) as a categorical palette for map
// boundaries, so country/city shapes are visually distinguishable without inventing
// new colors outside the existing design system.
const BOUNDARY_COLORS = [
  "#059669", // emerald
  "#E11D48", // rose
  "#7C3AED", // violet
  "#D97706", // amber
  "#EA580C", // orange
  "#0891B2", // cyan
  "#DC2626", // red
  "#0369A1", // sky
];

/** Color for the Nth boundary in a currently-rendered list (country or city), cycling
 *  through the shared palette. Assigning by position — not by hashing the name — means
 *  every boundary visible at once is guaranteed distinct as long as there are 8 or
 *  fewer of them, which covers every country/city list in this app today. */
export function colorForBoundaryIndex(index: number): string {
  return BOUNDARY_COLORS[index % BOUNDARY_COLORS.length];
}
