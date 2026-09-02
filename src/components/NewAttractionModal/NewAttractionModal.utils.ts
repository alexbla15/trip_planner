import type { PriceTabDraft, PrimaryCellRef } from "./attraction.types";

/**
 * Narrows the known-cities list to the selected country (if any) and returns
 * a deduped, alphabetically sorted list of city names for the searchable select.
 */
export function filterCityOptions(
  knownCities: { name: string; country: string }[],
  country: string,
): string[] {
  const scoped = country
    ? knownCities.filter((c) => c.country.toLowerCase() === country.toLowerCase())
    : knownCities;
  return [...new Set(scoped.map((c) => c.name))].sort((a, b) => a.localeCompare(b));
}

let draftIdCounter = 0;
/** Generates a client-only id for a new tab/row/column — never sent to/received from the
 *  API. Counter-based (not random) so ids stay stable/readable across a session and don't
 *  depend on `crypto.randomUUID` availability. */
export function nextDraftId(prefix: string): string {
  draftIdCounter += 1;
  return `${prefix}-${Date.now()}-${draftIdCounter}`;
}

export function emptyPriceTab(product = ""): PriceTabDraft {
  const columnId = nextDraftId("col");
  return {
    id: nextDraftId("tab"),
    product,
    columns: [{ id: columnId, visitorType: "" }],
    rows: [{ id: nextDraftId("row"), label: "Regular", days: [], cells: { [columnId]: null } }],
  };
}

interface FlatPriceTier {
  product?: string;
  label: string;
  amount: number;
  isPrimary: boolean;
  visitorType?: string;
  days?: string[];
}

/** Converts a flat, submitted `prices` array (the API/model shape — one entry per
 *  tier+visitor-type combination) back into the editor's tab/grid draft shape, for
 *  opening the modal in edit mode. Tiers are grouped into tabs by `product` (falling back
 *  to `label` when unset, matching the read-only pivot in AttractionDetailModal), then
 *  pivoted into rows (distinct `label`) x columns (distinct `visitorType`) within each
 *  tab, in first-seen order. A row's `days` is taken from the first tier seen for that
 *  row — cells within one row are expected to share the same day-scope (see
 *  `PriceGridRowDraft`); if source data disagrees, later cells silently keep the row's
 *  first-seen days. */
export function flatPriceTiersToTabs(tiers: FlatPriceTier[]): { tabs: PriceTabDraft[]; primary: PrimaryCellRef | null } {
  if (tiers.length === 0) return { tabs: [emptyPriceTab()], primary: null };

  const tabs: PriceTabDraft[] = [];
  const tabByProduct = new Map<string, PriceTabDraft>();
  let primary: PrimaryCellRef | null = null;

  for (const tier of tiers) {
    const productKey = tier.product?.trim() || tier.label;
    let tab = tabByProduct.get(productKey);
    if (!tab) {
      tab = { id: nextDraftId("tab"), product: tier.product ?? "", columns: [], rows: [] };
      tabByProduct.set(productKey, tab);
      tabs.push(tab);
    }

    const visitorType = tier.visitorType ?? "";
    let column = tab.columns.find((c) => c.visitorType === visitorType);
    if (!column) {
      column = { id: nextDraftId("col"), visitorType };
      tab.columns.push(column);
    }

    let row = tab.rows.find((r) => r.label === tier.label);
    if (!row) {
      row = { id: nextDraftId("row"), label: tier.label, days: tier.days ?? [], cells: {} };
      tab.rows.push(row);
    }
    row.cells[column.id] = tier.amount;

    if (tier.isPrimary) primary = { tabId: tab.id, rowId: row.id, columnId: column.id };
  }

  return { tabs, primary };
}

/** Inverse of `flatPriceTiersToTabs` — flattens the editor's tab/grid draft back into the
 *  API's flat `prices` shape for submit. Cells with no amount set are dropped (not
 *  submitted as zero-price tiers). `primary` marks exactly one flattened tier as primary;
 *  if it no longer resolves to a real cell (e.g. that row/column was deleted) or was never
 *  set, the first tier with an amount is promoted instead — there must always be exactly
 *  one primary tier among a non-empty submitted list. */
export function tabsToFlatPriceTiers(tabs: PriceTabDraft[], primary: PrimaryCellRef | null): FlatPriceTier[] {
  const flat: FlatPriceTier[] = [];
  let primaryIndex = -1;

  for (const tab of tabs) {
    for (const row of tab.rows) {
      if (!row.label.trim()) continue;
      for (const column of tab.columns) {
        const amount = row.cells[column.id];
        if (amount == null) continue;
        if (primary && primary.tabId === tab.id && primary.rowId === row.id && primary.columnId === column.id) {
          primaryIndex = flat.length;
        }
        flat.push({
          product: tab.product.trim() || undefined,
          label: row.label.trim(),
          amount,
          isPrimary: false,
          visitorType: column.visitorType.trim() || undefined,
          days: row.days.length > 0 ? row.days : undefined,
        });
      }
    }
  }

  if (flat.length > 0) {
    flat[primaryIndex >= 0 ? primaryIndex : 0].isPrimary = true;
  }

  return flat;
}
