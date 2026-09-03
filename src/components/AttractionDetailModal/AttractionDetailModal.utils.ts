import type { PriceTier } from "@/types/attraction";

/** Derives a grouping key identifying "which product/brand this tier belongs to" from
 *  its `product` field (user-entered) or falls back to the `label` if no product is set.
 *  This determines which tab the tier appears under in the detail modal. */
export function getPriceProductKey(tier: PriceTier): string {
  return tier.product || tier.label;
}

export interface PriceTierTab {
  key: string;
  tiers: PriceTier[];
}

/** Groups `tiers` by product key (Galaxy, Entrance, etc.), in first-seen order. Each tab
 *  contains one product's tiers, pivoted into a Tier x Visitor Type grid via
 *  `buildPricePivot`. */
export function buildPriceTierTabs(tiers: PriceTier[]): PriceTierTab[] {
  const keyOrder: string[] = [];
  const byKey = new Map<string, PriceTier[]>();
  for (const tier of tiers) {
    const key = getPriceProductKey(tier);
    if (!byKey.has(key)) {
      byKey.set(key, []);
      keyOrder.push(key);
    }
    byKey.get(key)!.push(tier);
  }
  return keyOrder.map((key) => ({ key, tiers: byKey.get(key)! }));
}

const NO_VISITOR_TYPE = "__general__";

export interface PricePivotColumn {
  key: string;
  label: string;
}

export interface PricePivotRow {
  label: string;
  cells: Map<string, PriceTier>;
}

export interface PricePivot {
  columns: PricePivotColumn[];
  rows: PricePivotRow[];
}

/** Formats a tier's `days` array into a short human label, e.g. "Weekdays",
 *  "Weekends", "Mon, Wed, Fri", or "Any day" when unset. */
export function formatPriceDaysSummary(days?: string[]): string {
  if (!days || days.length === 0) return "Any day";
  if (days.length === 1 && days[0] === "weekday") return "Weekdays";
  if (days.length === 1 && days[0] === "weekend") return "Weekends";
  return days.map((d) => d.slice(0, 3)).join(", ");
}

/** Pivots one product tab's flat tier list into a Tier (row) x Visitor Type (column)
 *  grid — e.g. rows "Entry"/"VIP", columns "Adult"/"Children 2-12", so each cell is one
 *  tier's price instead of repeating the tier label once per visitor type. Tiers without
 *  a `visitorType` are bucketed into a single "General" column. Row/column order follows
 *  first-seen order in `tiers`. Rows are keyed by label + days, so two tiers with the same
 *  label but different applicable days (e.g. weekday vs weekend rate) each get their own
 *  row instead of the later one silently overwriting the earlier one; when a label has
 *  more than one such row, its days summary is appended to disambiguate. */
export function buildPricePivot(tiers: PriceTier[]): PricePivot {
  const columnOrder: string[] = [];
  const columnLabels = new Map<string, string>();
  const rowOrder: string[] = [];
  const rows = new Map<string, PricePivotRow & { baseLabel: string; daysSummary: string }>();

  for (const tier of tiers) {
    const columnKey = tier.visitorType || NO_VISITOR_TYPE;
    if (!columnLabels.has(columnKey)) {
      columnLabels.set(columnKey, tier.visitorType || "General");
      columnOrder.push(columnKey);
    }

    const daysKey = tier.days && tier.days.length > 0 ? tier.days.slice().sort().join(",") : "";
    const rowKey = `${tier.label}__${daysKey}`;
    if (!rows.has(rowKey)) {
      rows.set(rowKey, {
        label: tier.label,
        baseLabel: tier.label,
        daysSummary: formatPriceDaysSummary(tier.days),
        cells: new Map(),
      });
      rowOrder.push(rowKey);
    }
    rows.get(rowKey)!.cells.set(columnKey, tier);
  }

  const labelCounts = new Map<string, number>();
  for (const key of rowOrder) {
    const baseLabel = rows.get(key)!.baseLabel;
    labelCounts.set(baseLabel, (labelCounts.get(baseLabel) ?? 0) + 1);
  }

  return {
    columns: columnOrder.map((key) => ({ key, label: columnLabels.get(key)! })),
    rows: rowOrder.map((key) => {
      const row = rows.get(key)!;
      const label = (labelCounts.get(row.baseLabel) ?? 0) > 1 ? `${row.baseLabel} (${row.daysSummary})` : row.baseLabel;
      return { label, cells: row.cells };
    }),
  };
}
