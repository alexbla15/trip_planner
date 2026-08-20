import { tintColor } from "@/lib";

export interface CategoryCount {
  _id: string;
  count: number;
}

export interface DonutSlice {
  cat: CategoryCount;
  i: number;
  startAngle: number;
  endAngle: number;
  color: string;
}

export interface SubDonutSlice {
  _id: string;
  count: number;
  i: number;
  startAngle: number;
  endAngle: number;
  color: string;
}

/** Rolls up raw per-type counts into per-category totals, sorted by count descending. */
export function aggregateByCategory(
  rawTypes: CategoryCount[],
  byCategory: Record<string, Array<{ name: string }>>,
): CategoryCount[] {
  const map: Record<string, number> = {};
  for (const { _id, count } of rawTypes) {
    for (const [cat, catTypes] of Object.entries(byCategory)) {
      if (catTypes.some((t) => t.name === _id)) {
        map[cat] = (map[cat] ?? 0) + count;
        break;
      }
    }
  }
  return Object.entries(map)
    .map(([cat, count]) => ({ _id: cat, count }))
    .sort((a, b) => b.count - a.count);
}

/** Builds the main donut's slice geometry, falling back to a generated hue when no category color exists. */
export function buildCategorySlices(
  categoryAggregated: CategoryCount[],
  categoryTotal: number,
  colorForCategory: (cat: string) => string,
): DonutSlice[] {
  let cum = 0;
  return categoryAggregated.map((cat, i) => {
    const pct = categoryTotal > 0 ? cat.count / categoryTotal : 0;
    const startAngle = cum;
    const endAngle = cum + pct * 360;
    cum = endAngle;
    const color =
      colorForCategory(cat._id) !== "#64748B"
        ? colorForCategory(cat._id)
        : `hsl(${(i * 47) % 360}, 70%, 80%)`;
    return { cat, i, startAngle, endAngle, color };
  });
}

/** Builds the drill-down sub-donut's slice geometry, tinting the parent category's color per slice. */
export function buildSubSlices(
  selectedCategory: string | null,
  subChartTypes: CategoryCount[],
  subChartTotal: number,
  colorForCategory: (cat: string) => string,
): SubDonutSlice[] {
  if (!selectedCategory || subChartTypes.length === 0) return [];
  const baseColor = colorForCategory(selectedCategory);
  let cum = 0;
  return subChartTypes.map(({ _id, count }, i) => {
    const pct = subChartTotal > 0 ? count / subChartTotal : 0;
    const startAngle = cum;
    const endAngle = cum + pct * 360;
    cum = endAngle;
    const opacity = 1.0 - (i / Math.max(subChartTypes.length - 1, 1)) * 0.65;
    return { _id, count, i, startAngle, endAngle, color: tintColor(baseColor, opacity) };
  });
}
