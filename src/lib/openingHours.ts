import type { OpeningHours, OpeningHoursDay, OpeningHoursRange } from "@/components/NewAttractionModal/attraction.types";
import { DEFAULT_OPENING_HOURS, DAY_KEYS } from "@/components/NewAttractionModal/attraction.constants";

/** Returns a fresh, independently-mutable copy of the default weekly opening-hours template. */
export function buildInitialHours(): OpeningHours {
  return structuredClone(DEFAULT_OPENING_HOURS);
}

// Pre-multi-range documents stored a single {closed, open, close} pair per day
// instead of {closed, ranges: [...]}. Kept narrow (no `OpeningHoursDay` import)
// since it describes data that predates that type.
interface LegacyOpeningHoursDay {
  closed?: boolean;
  open?: string;
  close?: string;
  ranges?: OpeningHoursRange[];
}

function normalizeDay(day: LegacyOpeningHoursDay | undefined): OpeningHoursDay | undefined {
  if (!day) return undefined;
  if (Array.isArray(day.ranges)) {
    return { closed: !!day.closed, ranges: day.ranges };
  }
  if (day.open && day.close) {
    return { closed: !!day.closed, ranges: [{ open: day.open, close: day.close }] };
  }
  return undefined;
}

/** Upgrades opening hours from any prior shape (single open/close pair per day) into the
 *  current multi-range shape, filling in the default template for any missing/malformed day.
 *  Safe to call on already-current-shape data (a no-op besides the defensive clone/fill). */
export function normalizeOpeningHours(hours: unknown): OpeningHours {
  const raw = (hours ?? {}) as Record<string, LegacyOpeningHoursDay>;
  const fallback = DEFAULT_OPENING_HOURS;
  const result = {} as OpeningHours;
  for (const day of DAY_KEYS) {
    result[day] = normalizeDay(raw[day]) ?? structuredClone(fallback[day]);
  }
  return result;
}

/** True when `hours` already has at least one real (non-default) day filled in — used to
 *  decide whether fetched/incoming data should replace the blank default template. */
export function hasOpeningHoursData(hours: unknown): boolean {
  const raw = hours as Record<string, LegacyOpeningHoursDay> | undefined;
  const mon = raw?.Mon;
  return !!mon && (Array.isArray(mon.ranges) ? mon.ranges.length > 0 : !!(mon.open && mon.close));
}

/** The shape `NewAttractionModal`'s "24/7" shortcut writes: every day open, one
 *  00:00–23:59 range. Used to detect it (on load, so editing a 24/7 attraction shows
 *  the 24/7 flag instead of a week of 00:00–23:59 rows; and in read-only displays, so
 *  they show a "24/7" flag instead of the same redundant per-day table). Accepts the
 *  broader `Record<string, OpeningHoursDay>` shape so callers using either the form-side
 *  `OpeningHours` type or the API/shared `types/attraction.ts` one can both pass through. */
export function isAllDay24h(hours: Record<string, OpeningHoursDay>): boolean {
  return DAY_KEYS.every((day) => {
    const d = hours[day];
    return !!d && !d.closed && d.ranges.length === 1 && d.ranges[0].open === "00:00" && d.ranges[0].close === "23:59";
  });
}

/** True when every day of the week is marked closed — the attraction is permanently
 *  closed, as opposed to just having some days closed (normal partial hours). */
export function isPermanentlyClosed(hours: Record<string, OpeningHoursDay>): boolean {
  return DAY_KEYS.every((day) => !!hours[day]?.closed);
}
