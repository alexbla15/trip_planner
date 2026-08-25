import { Ban, CalendarDays, Clock, type LucideIcon } from "lucide-react";
import { isAllDay24h, isPermanentlyClosed } from "./openingHours";
import { isYearRound, formatOpeningMonthsLabel } from "./openingMonths";
import type { OpeningHours } from "@/types/attraction";

export interface StatusChipDescriptor {
  key: string;
  icon: LucideIcon;
  label: string;
  /** Visual tone — "primary" (default) for neutral/positive facts (24/7, seasonal),
   *  "danger" for facts that warn against visiting (permanently closed). */
  tone?: "primary" | "danger";
}

/** Derives every applicable status chip (24/7, seasonal restriction, permanently
 *  closed) from an attraction's opening-hours/opening-months data. Callers just render
 *  whatever this returns — adding a new status concept later is a one-line addition
 *  here, not a change to any call site.
 *
 *  Permanently closed takes precedence over everything else and short-circuits: there's
 *  no meaningful "24/7" or "season" to report once a place is shut for good. 24/7 and
 *  the seasonal chip are independent facts (weekly hours vs. which months apply) and
 *  can coexist — e.g. a beach club open every hour, only March–September.
 *
 *  Deliberately does NOT show a "Year-round" chip when the attraction has no seasonal
 *  restriction — that's the default/common case for almost every attraction, so a chip
 *  confirming it would be noise on every card. The chip only appears to flag the
 *  exception (a genuine seasonal restriction), matching the same "chip = exception to
 *  the default" pattern as "Permanently closed". */
export function getStatusChips(
  openingHours: OpeningHours | undefined,
  openingMonths?: number[]
): StatusChipDescriptor[] {
  if (!openingHours) return [];

  if (isPermanentlyClosed(openingHours)) {
    return [{ key: "permanently-closed", icon: Ban, label: "Permanently closed", tone: "danger" }];
  }

  const chips: StatusChipDescriptor[] = [];

  if (isAllDay24h(openingHours)) {
    chips.push({ key: "open-24-7", icon: Clock, label: "Open 24/7" });
  }

  if (!isYearRound(openingMonths)) {
    chips.push({ key: "seasonal", icon: CalendarDays, label: `Open ${formatOpeningMonthsLabel(openingMonths!)}` });
  }

  return chips;
}
