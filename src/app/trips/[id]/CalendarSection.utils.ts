import type { Attraction } from "@/types/attraction";
import { MIN_OVERLAP_DURATION_MINS } from "@/config/ui";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AlertType = "closed" | "conflict" | "overflow";

export interface ScheduleAlert {
  id:      string;
  type:    AlertType;
  message: string;
}

// ── Private helpers ───────────────────────────────────────────────────────────

const DOW_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function attractionEndMins(a: Attraction): number {
  if (!a.plannedTime) return 0;
  const start = timeToMins(a.plannedTime);
  const val   = parseFloat(a.actualDurationValue ?? a.durationValue ?? "0");
  const unit  = a.actualDurationUnit ?? a.durationUnit ?? "hours";
  const dur   = unit === "hours" ? val * 60 : val;
  return start + Math.max(dur, MIN_OVERLAP_DURATION_MINS);
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
  const open    = timeToMins(hours.open);
  const close   = timeToMins(hours.close);
  if (planned < open || planned >= close) {
    return {
      id:      `closed-${a._id}`,
      type:    "closed",
      message: `"${a.name}" is scheduled at ${a.plannedTime} but opens ${hours.open}–${hours.close}.`,
    };
  }

  return null;
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
      const endH = String(Math.floor(endMins / 60)).padStart(2, "0");
      const endM = String(endMins % 60).padStart(2, "0");
      alerts.push({
        id:      `overflow-end-${a._id}`,
        type:    "overflow",
        message: `"${a.name}" runs until ${endH}:${endM}, past the visible day end (${String(dayEnd).padStart(2, "0")}:00).`,
      });
    }
  }
  return alerts;
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
  }

  alerts.push(...getConflictAlerts(local));
  alerts.push(...getOverflowAlerts(local, dayStart, dayEnd));

  // Deduplicate by id
  return alerts.filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i);
}
