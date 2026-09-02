import type { Attraction } from "@/types/attraction";
import { timeToMins, isYearRound, formatOpeningMonthsLabel, formatSeasonalRangeLabel, isMonthDayInRange } from "@/lib";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AlertType = "closed" | "conflict" | "overflow" | "season";

export interface ScheduleAlert {
  id:      string;
  type:    AlertType;
  message: string;
}

// ── Private helpers ───────────────────────────────────────────────────────────

const DOW_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// Not the same function as src/lib/schedule.ts#attractionEndMins: this one has
// no minimum-duration floor and tolerates a missing plannedTime (returns 0)
// rather than asserting it's set — the two were never true duplicates despite
// sharing a name, so this stays local rather than being folded into the shared
// helper (which would change alert behavior for short-duration attractions).
function attractionEndMins(a: Attraction): number {
  if (!a.plannedTime) return 0;
  const start = timeToMins(a.plannedTime);
  const val   = parseFloat(a.actualDurationValue ?? a.durationValue ?? "0");
  const unit  = a.actualDurationUnit ?? a.durationUnit ?? "hours";
  const dur   = unit === "hours" ? val * 60 : val;
  return start + dur;
}

// ── Condition A: venue closed at planned time ─────────────────────────────────

function getClosedAlert(a: Attraction): ScheduleAlert | null {
  if (!a.plannedDate || !a.plannedTime || !a.openingHours) return null;

  const dow = DOW_KEYS[new Date(a.plannedDate).getUTCDay()];
  const hours = a.openingHours[dow];
  if (!hours) return null;

  if (hours.closed) {
    return {
      id:      `closed-${a._id}`,
      type:    "closed",
      message: `"${a.name}" is scheduled at ${a.plannedTime} but is closed on ${dow}s.`,
    };
  }

  const planned = timeToMins(a.plannedTime);
  const ranges  = hours.ranges ?? [];
  // A range is checked individually so a venue with split hours (e.g. 10:00-12:00 and
  // 13:00-15:00) is only "closed" when the planned time falls in none of its ranges.
  // An overnight range (e.g. 18:00-03:00) wraps past midnight, so within that single
  // range "open" is the gap between close and open rather than the region outside it.
  const isWithinRange = (open: number, close: number) =>
    close < open ? (planned >= open || planned < close) : (planned >= open && planned < close);
  const isOpen = ranges.some((r) => isWithinRange(timeToMins(r.open), timeToMins(r.close)));
  if (!isOpen) {
    const hoursLabel = ranges.map((r) => `${r.open}–${r.close}`).join(", ");
    return {
      id:      `closed-${a._id}`,
      type:    "closed",
      message: `"${a.name}" is scheduled at ${a.plannedTime} but opens ${hoursLabel}.`,
    };
  }

  return null;
}

// ── Condition A2: venue out of season at planned date ─────────────────────────

function getOutOfSeasonAlert(a: Attraction): ScheduleAlert | null {
  if (!a.plannedDate || isYearRound(a.openingMonths)) return null;

  const planned = new Date(a.plannedDate);
  const month = planned.getUTCMonth() + 1; // 1–12

  if (a.seasonalStart && a.seasonalEnd) {
    const day = planned.getUTCDate();
    if (isMonthDayInRange({ month, day }, a.seasonalStart, a.seasonalEnd)) return null;
    return {
      id:      `season-${a._id}`,
      type:    "season",
      message: `"${a.name}" is scheduled on ${a.plannedDate} but is only open ${formatSeasonalRangeLabel(a.seasonalStart, a.seasonalEnd)}.`,
    };
  }

  if (a.openingMonths!.includes(month)) return null;

  return {
    id:      `season-${a._id}`,
    type:    "season",
    message: `"${a.name}" is scheduled on ${a.plannedDate} but is only open ${formatOpeningMonthsLabel(a.openingMonths!)}.`,
  };
}

// ── Condition B: parallel time conflicts ──────────────────────────────────────

function getConflictAlerts(local: Attraction[]): ScheduleAlert[] {
  const byDay: Record<string, Attraction[]> = {};
  for (const a of local) {
    if (a.plannedDate && a.plannedTime) {
      (byDay[a.plannedDate] ??= []).push(a);
    }
  }

  const alerts: ScheduleAlert[] = [];
  for (const dayAttractions of Object.values(byDay)) {
    const sorted = [...dayAttractions].sort(
      (a, b) => timeToMins(a.plannedTime!) - timeToMins(b.plannedTime!)
    );
    for (let i = 0; i < sorted.length; i++) {
      const aEnd = attractionEndMins(sorted[i]);
      for (let j = i + 1; j < sorted.length; j++) {
        const bStart = timeToMins(sorted[j].plannedTime!);
        if (bStart >= aEnd) break;
        const pairId = [sorted[i]._id, sorted[j]._id].sort().join("_");
        alerts.push({
          id:      `conflict-${pairId}`,
          type:    "conflict",
          message: `"${sorted[i].name}" and "${sorted[j].name}" overlap in time.`,
        });
      }
    }
  }
  return alerts;
}

// ── Condition C: schedule overflows visible day window ────────────────────────

function getOverflowAlerts(
  local: Attraction[],
  dayStart: number,
  dayEnd: number,
): ScheduleAlert[] {
  const alerts: ScheduleAlert[] = [];
  for (const a of local) {
    if (!a.plannedTime) continue;

    const startMins = timeToMins(a.plannedTime);
    const endMins   = attractionEndMins(a);

    if (startMins < dayStart * 60) {
      alerts.push({
        id:      `overflow-start-${a._id}`,
        type:    "overflow",
        message: `"${a.name}" starts before the visible day window (${String(dayStart).padStart(2, "0")}:00).`,
      });
    } else if (endMins > dayEnd * 60) {
      // Wrap past midnight (endMins can exceed 1440 for an overnight item) so the
      // displayed time is always a real clock time, e.g. "00:50" not "24:50" —
      // and say so explicitly, since (unlike the overnight-continuation blocks
      // rendered on the next day's column) this message has no visual next-day
      // context of its own.
      const wrappedEnd = endMins % 1440;
      const endH = String(Math.floor(wrappedEnd / 60)).padStart(2, "0");
      const endM = String(wrappedEnd % 60).padStart(2, "0");
      const dayNote = endMins >= 1440 ? " the next day" : "";
      alerts.push({
        id:      `overflow-end-${a._id}`,
        type:    "overflow",
        message: `"${a.name}" runs until ${endH}:${endM}${dayNote}, past the visible day end (${String(dayEnd).padStart(2, "0")}:00).`,
      });
    }
  }
  return alerts;
}

// ── Initial day-window bounds (fit to schedule) ────────────────────────────────

/** Earliest start / latest end across all timed attractions, rounded out to whole
 *  hours (floor start, ceil end, clamped to 0..24). Returns null when nothing is
 *  scheduled yet, so callers can fall back to a fixed default. */
export function computeScheduleHourBounds(
  attractions: Attraction[]
): { start: number; end: number } | null {
  const timed = attractions.filter((a) => !!a.plannedTime);
  if (timed.length === 0) return null;

  let minStart = Infinity;
  let maxEnd = -Infinity;
  for (const a of timed) {
    const start = timeToMins(a.plannedTime!);
    const end = attractionEndMins(a);
    if (start < minStart) minStart = start;
    if (end > maxEnd) maxEnd = end;
  }

  return {
    start: Math.max(0, Math.floor(minStart / 60)),
    end: Math.min(24, Math.ceil(maxEnd / 60)),
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export function computeAlerts(
  local: Attraction[],
  dayStart: number,
  dayEnd: number,
): ScheduleAlert[] {
  const alerts: ScheduleAlert[] = [];

  for (const a of local) {
    const closed = getClosedAlert(a);
    if (closed) alerts.push(closed);
    const outOfSeason = getOutOfSeasonAlert(a);
    if (outOfSeason) alerts.push(outOfSeason);
  }

  alerts.push(...getConflictAlerts(local));
  alerts.push(...getOverflowAlerts(local, dayStart, dayEnd));

  // Deduplicate by id
  return alerts.filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i);
}
