import { Ban, Clock, type LucideIcon } from "lucide-react";
import { isAllDay24h, isPermanentlyClosed } from "./openingHours";
import type { OpeningHours } from "@/types/attraction";

export interface StatusChipDescriptor {
  key: string;
  icon: LucideIcon;
  label: string;
  /** Visual tone — "primary" (default) for neutral/positive facts (24/7, year-round),
   *  "danger" for facts that warn against visiting (permanently closed). */
  tone?: "primary" | "danger";
}

/** Derives every applicable status chip (currently: 24/7, permanently closed; future
 *  tasks add "Year-round" here) from an attraction's opening-hours data. Callers just
 *  render whatever this returns — adding a new status concept later is a one-line
 *  addition here, not a change to any call site.
 *
 *  Permanently closed takes precedence over 24/7: both conditions can't genuinely
 *  co-occur (every day closed vs. every day open 00:00–23:59), but if the data is
 *  ever in a contradictory state, "permanently closed" is the more important fact to
 *  surface, so it's checked first and short-circuits the rest. */
export function getStatusChips(openingHours: OpeningHours | undefined): StatusChipDescriptor[] {
  if (!openingHours) return [];

  if (isPermanentlyClosed(openingHours)) {
    return [{ key: "permanently-closed", icon: Ban, label: "Permanently closed", tone: "danger" }];
  }

  const chips: StatusChipDescriptor[] = [];

  if (isAllDay24h(openingHours)) {
    chips.push({ key: "open-24-7", icon: Clock, label: "Open 24/7" });
  }

  return chips;
}
