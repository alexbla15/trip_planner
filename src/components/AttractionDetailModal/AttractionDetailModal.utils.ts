import type { PriceTier } from "@/types/attraction";

export const DAY_TYPE_HEADINGS: Record<"weekday" | "weekend", string> = {
  weekday: "Mon–Thu",
  weekend: "Fri–Sun & holidays",
};

/** Distinct `visitorType` values among `tiers`, in first-seen order. Tiers without a
 *  `visitorType` don't contribute an entry — they're shown regardless of which filter
 *  (or "all") is active. */
export function getDistinctVisitorTypes(tiers: PriceTier[]): string[] {
  const seen: string[] = [];
  for (const tier of tiers) {
    if (tier.visitorType && !seen.includes(tier.visitorType)) seen.push(tier.visitorType);
  }
  return seen;
}

/** `activeVisitorType === null` means "All" — every tier passes. Otherwise only tiers
 *  matching that exact `visitorType` pass (tiers with no `visitorType` are hidden, same
 *  as tiers of a different type). */
export function filterPricesByVisitorType(tiers: PriceTier[], activeVisitorType: string | null): PriceTier[] {
  if (activeVisitorType === null) return tiers;
  return tiers.filter((t) => t.visitorType === activeVisitorType);
}

export interface PriceTierGroup {
  dayType: "weekday" | "weekend" | null;
  heading: string | null;
  tiers: PriceTier[];
}

/** Groups tiers into weekday → weekend → ungrouped (no `dayType`) sections, in that fixed
 *  order, skipping any section with no tiers. Within each group, tiers are sorted by
 *  `visitorType` in the order that type first appeared across the FULL (pre-grouping)
 *  tier list — keeps an "Adult first" venue Adult-first in every group, rather than
 *  re-sorting per group. Returns a single ungrouped section with no heading when none of
 *  the tiers have a `dayType` at all (the original flat-list behavior). */
export function buildPriceTierGroups(tiers: PriceTier[]): PriceTierGroup[] {
  if (!tiers.some((t) => t.dayType)) {
    return [{ dayType: null, heading: null, tiers }];
  }

  const visitorOrder = getDistinctVisitorTypes(tiers);
  const rank = (t: PriceTier) => {
    if (!t.visitorType) return visitorOrder.length;
    const i = visitorOrder.indexOf(t.visitorType);
    return i === -1 ? visitorOrder.length : i;
  };
  const sortByVisitor = (list: PriceTier[]) => [...list].sort((a, b) => rank(a) - rank(b));

  const groups: PriceTierGroup[] = [];
  for (const dayType of ["weekday", "weekend"] as const) {
    const matching = tiers.filter((t) => t.dayType === dayType);
    if (matching.length > 0) groups.push({ dayType, heading: DAY_TYPE_HEADINGS[dayType], tiers: sortByVisitor(matching) });
  }
  const ungrouped = tiers.filter((t) => !t.dayType);
  if (ungrouped.length > 0) groups.push({ dayType: null, heading: null, tiers: sortByVisitor(ungrouped) });

  return groups;
}
