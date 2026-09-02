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
 *  contains one product's tiers, displayed as a simple 3-column table (Field / Visitor
 *  Type / Price). Tiers without a `visitorType` show an empty visitor-type cell. */
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
