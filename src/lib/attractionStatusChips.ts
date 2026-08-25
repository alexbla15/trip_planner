import { Clock, type LucideIcon } from "lucide-react";
import { isAllDay24h } from "./openingHours";
import type { OpeningHours } from "@/types/attraction";

export interface StatusChipDescriptor {
  key: string;
  icon: LucideIcon;
  label: string;
}

/** Derives every applicable status chip (currently: 24/7; future tasks add
 *  "Year-round" and "Permanently closed" here) from an attraction's opening-hours
 *  data. Callers just render whatever this returns — adding a new status concept
 *  later is a one-line addition here, not a change to any call site. */
export function getStatusChips(openingHours: OpeningHours | undefined): StatusChipDescriptor[] {
  if (!openingHours) return [];

  const chips: StatusChipDescriptor[] = [];

  if (isAllDay24h(openingHours)) {
    chips.push({ key: "open-24-7", icon: Clock, label: "Open 24/7" });
  }

  return chips;
}
