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

/** Pivots one product tab's flat tier list into a Tier (row) x Visitor Type (column)
 *  grid — e.g. rows "Entry"/"VIP", columns "Adult"/"Children 2-12", so each cell is one
 *  tier's price instead of repeating the tier label once per visitor type. Tiers without
 *  a `visitorType` are bucketed into a single "General" column. Row/column order follows
 *  first-seen order in `tiers`. If two tiers land on the same row+column (duplicate
 *  label+visitorType), the later one wins. */
export function buildPricePivot(tiers: PriceTier[]): PricePivot {
  const columnOrder: string[] = [];
  const columnLabels = new Map<string, string>();
  const rowOrder: string[] = [];
  const rows = new Map<string, PricePivotRow>();

  for (const tier of tiers) {
    const columnKey = tier.visitorType || NO_VISITOR_TYPE;
    if (!columnLabels.has(columnKey)) {
      columnLabels.set(columnKey, tier.visitorType || "General");
      columnOrder.push(columnKey);
    }

    const rowKey = tier.label;
    if (!rows.has(rowKey)) {
      rows.set(rowKey, { label: rowKey, cells: new Map() });
      rowOrder.push(rowKey);
    }
    rows.get(rowKey)!.cells.set(columnKey, tier);
  }

  return {
    columns: columnOrder.map((key) => ({ key, label: columnLabels.get(key)! })),
    rows: rowOrder.map((key) => rows.get(key)!),
  };
}
