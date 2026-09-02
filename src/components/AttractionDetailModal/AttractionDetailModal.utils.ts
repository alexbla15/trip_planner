import type { PriceTier } from "@/types/attraction";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Derives a grouping key identifying "which product/brand this tier belongs to" from
 *  its `label`, WITHOUT ever changing the stored `label` itself (see docs/LEARNINGS.md —
 *  `label` is a de-facto foreign key via `Trip.schedules.priceTierQuantities` and must
 *  stay byte-for-byte stable). Strips the day-range parenthetical (only when `dayType` is
 *  set) and the tier's own `visitorType` word, so "Galaxy 3h Adult (Mon-Thu)" and
 *  "Galaxy 3h Child (Fri-Sun & holidays)" both resolve to "Galaxy 3h" and become one tab.
 *  This is a best-effort heuristic — a tier whose leftover text doesn't match any sibling
 *  simply becomes its own tab instead. */
export function getPriceProductKey(tier: PriceTier): string {
  let key = tier.label;
  if (tier.dayType) key = key.replace(/\s*\([^)]*\)\s*$/, "");
  if (tier.visitorType) key = key.replace(new RegExp(`\\b${escapeRegExp(tier.visitorType)}\\b`, "i"), " ");
  key = key.replace(/\s+/g, " ").trim();
  return key || tier.label;
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
