import type { Attraction } from "@/types/attraction";
import type { TravelMode } from "@/services";
import {
  DEFAULT_DAY_START,
  DEFAULT_DAY_END,
  SLOT_HEIGHT_PX,
  MIN_CARD_HEIGHT_PX,
  MIN_BLOCK_WIDTH_PX,
  MIN_OVERLAP_DURATION_MINS,
} from "@/config/ui";

export function timeToMins(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function attractionEndMins(a: Attraction): number {
  const start = timeToMins(a.plannedTime!);
  const val = parseFloat(a.actualDurationValue ?? a.durationValue ?? "0");
  const unit = a.actualDurationUnit ?? a.durationUnit ?? "hours";
  const dur = unit === "hours" ? val * 60 : val;
  return start + Math.max(dur, MIN_OVERLAP_DURATION_MINS);
}

// Real declared end time, with no MIN_OVERLAP_DURATION_MINS floor — unlike
// attractionEndMins above (used for calendar layout/spacing, where a visual minimum
// block size is wanted), a genuine routing conflict must be based only on the
// attraction's actual duration. Flooring it made back-to-back or short-gap
// attractions falsely read as "conflicting" on the map with no real overlap.
function attractionEndMinsExact(a: Attraction): number {
  const start = timeToMins(a.plannedTime!);
  const val = parseFloat(a.actualDurationValue ?? a.durationValue ?? "0");
  const unit = a.actualDurationUnit ?? a.durationUnit ?? "hours";
  const dur = unit === "hours" ? val * 60 : val;
  return start + Math.max(dur, 0);
}

export function legKey(fromId: string, toId: string, mode: TravelMode): string {
  return `${mode}__${fromId}__${toId}`;
}

export interface ConflictGroup {
  key: string;
  attractions: Attraction[];
}

export function detectConflicts(sorted: Attraction[]): ConflictGroup[] {
  const groups: ConflictGroup[] = [];
  let i = 0;
  while (i < sorted.length) {
    const group: Attraction[] = [sorted[i]];
    let groupEnd = attractionEndMinsExact(sorted[i]);
    let j = i + 1;
    while (j < sorted.length) {
      const jStart = timeToMins(sorted[j].plannedTime!);
      if (jStart < groupEnd) {
        group.push(sorted[j]);
        groupEnd = Math.max(groupEnd, attractionEndMinsExact(sorted[j]));
        j++;
      } else {
        break;
      }
    }
    if (group.length > 1) {
      groups.push({ key: String(timeToMins(sorted[i].plannedTime!)), attractions: group });
    }
    i = j > i + 1 ? j : i + 1;
  }
  return groups;
}

export function findRouteNeighbour(alt: Attraction, route: Attraction[]): Attraction | null {
  if (route.length === 0) return null;
  const altTime = timeToMins(alt.plannedTime!);
  return route.reduce((nearest, r) =>
    Math.abs(timeToMins(r.plannedTime!) - altTime) <
    Math.abs(timeToMins(nearest.plannedTime!) - altTime)
      ? r : nearest
  );
}

export interface LayoutItem {
  attraction: Attraction;
  startMins: number;
  endMins: number;
  col: number;     // 0-based column index within overlapping group
  numCols: number; // total columns in the widest overlap
}

/**
 * Assigns each timed attraction a column index (col) and the total
 * number of columns it shares with overlapping peers (numCols).
 */
export function layoutTimed(timed: Attraction[]): LayoutItem[] {
  if (timed.length === 0) return [];

  const items: LayoutItem[] = timed
    .filter((a) => !!a.plannedTime)
    .map((a) => ({
      attraction: a,
      startMins:  timeToMins(a.plannedTime!),
      endMins:    attractionEndMins(a),
      col: 0,
      numCols: 1,
    }))
    .sort((a, b) => a.startMins - b.startMins);

  // Interval-graph colouring: assign each item the lowest free column
  const colEnd: number[] = []; // colEnd[c] = end time of last item placed in column c
  for (const item of items) {
    const freeCol = colEnd.findIndex((e) => e <= item.startMins);
    if (freeCol !== -1) {
      item.col = freeCol;
      colEnd[freeCol] = item.endMins;
    } else {
      item.col = colEnd.length;
      colEnd.push(item.endMins);
    }
  }

  // Post-pass: set numCols = max columns used by any set of concurrent items
  for (const item of items) {
    const concurrent = items.filter(
      (o) => o.startMins < item.endMins && o.endMins > item.startMins,
    );
    item.numCols = Math.max(...concurrent.map((o) => o.col + 1));
  }

  return items;
}

/**
 * Returns the earliest "HH:MM" that fits a new attraction of `durationMins`
 * without overlapping any already-timed attraction on the same day.
 */
export function findEarliestFreeSlot(timedOnDay: Attraction[], durationMins: number): string {
  const events = timedOnDay
    .filter((a) => !!a.plannedTime)
    .map((a) => ({ start: timeToMins(a.plannedTime!), end: attractionEndMins(a) }))
    .sort((a, b) => a.start - b.start);

  let candidate = DEFAULT_DAY_START * 60; // start at 07:00

  for (const ev of events) {
    // If the new block fits before this event, stop
    if (candidate + durationMins <= ev.start) break;
    // Otherwise push candidate to the end of this event
    candidate = Math.max(candidate, ev.end);
  }

  // Clamp to within the visible range
  candidate = Math.min(candidate, (DEFAULT_DAY_END - 1) * 60);

  const h = Math.floor(candidate / 60);
  const m = candidate % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Width in px of a day column given its max concurrent overlaps */
export function dayColumnWidth(maxOverlap: number): number {
  const LABEL_W = 46; // px for time labels + divider
  const PAD_R   = 4;
  return Math.max(200, LABEL_W + maxOverlap * MIN_BLOCK_WIDTH_PX + PAD_R);
}

/**
 * Fix #2 — span from earliest start to latest end across timed attractions.
 * e.g. 9:00–11:00 and 13:00–14:30 → span = 14:30−9:00 = 5.5h, not 2+1.5=3.5h.
 */
export function calcDaySpanMinutes(timedItems: Attraction[]): number {
  const timed = timedItems.filter((a) => !!a.plannedTime);
  if (timed.length === 0) return 0;
  const earliest = Math.min(...timed.map((a) => timeToMins(a.plannedTime!)));
  const latest   = Math.max(...timed.map((a) => attractionEndMins(a)));
  return Math.max(0, latest - earliest);
}

export function calcSpend(items: Attraction[]): number {
  return items.reduce((s, a) => s + (a.price ?? 0), 0);
}

export function fmt(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

/** px from timeline top for a "HH:MM" string — supports minutes */
export function slotTop(time: string, startHour: number): number {
  const [h, m] = time.split(":").map(Number);
  return ((h - startHour) + (m || 0) / 60) * SLOT_HEIGHT_PX;
}

/** Card height in px from duration */
export function cardPx(a: Attraction): number {
  const raw = parseFloat(a.actualDurationValue ?? a.durationValue ?? "");
  if (isNaN(raw) || raw <= 0) return MIN_CARD_HEIGHT_PX;
  const unit = a.actualDurationUnit ?? a.durationUnit ?? "hours";
  const hours = unit === "minutes" ? raw / 60 : raw;
  return Math.max(hours * SLOT_HEIGHT_PX, MIN_CARD_HEIGHT_PX);
}

/** Hour options for the day-range selects, as "HH:00" labels. */
export function makeHourSlots(start: number, end: number): string[] {
  return Array.from({ length: end - start }, (_, i) => {
    const h = start + i;
    return `${String(h).padStart(2, "0")}:00`;
  });
}
