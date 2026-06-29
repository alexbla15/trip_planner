"use client";

import { useState, useEffect } from "react";
import { Calendar, X, Clock } from "lucide-react";
import { ICONS } from "@/components/NewAttractionModal/AttractionTypeChip";
import type { AttractionType } from "@/components/NewAttractionModal/attraction.types";
import type { Trip } from "@/types/trip";
import type { Attraction } from "@/types/attraction";
import styles from "./CalendarSection.module.css";

// ── Pure utils ────────────────────────────────────────────────────────────────

const HOUR_SLOTS = Array.from({ length: 16 }, (_, i) => {
  const h = 7 + i; // 07:00 – 22:00
  return `${String(h).padStart(2, "0")}:00`;
});

function getTripDays(start: string, end: string): string[] {
  const days: string[] = [];
  const d = new Date(start);
  const last = new Date(end);
  while (d <= last) {
    days.push(d.toISOString().split("T")[0]);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

function formatDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function calcTotalMinutes(items: Attraction[]): number {
  return items.reduce((sum, a) => {
    if (!a.actualDurationValue) return sum;
    const val = parseFloat(a.actualDurationValue);
    if (isNaN(val)) return sum;
    return sum + (a.actualDurationUnit === "hours" ? val * 60 : val);
  }, 0);
}

function calcTotalSpend(items: Attraction[]): number {
  return items.reduce((sum, a) => sum + (a.price ?? 0), 0);
}

function fmt(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CalendarSectionProps {
  trip: Trip;
  attractions: Attraction[];
  onAttractionsChange: (updated: Attraction[]) => void;
  token: string;
  isOwner: boolean;
}

export function CalendarSection({
  trip,
  attractions,
  onAttractionsChange,
  token,
  isOwner,
}: CalendarSectionProps) {
  const [local, setLocal] = useState<Attraction[]>(attractions);
  const [saveError, setSaveError] = useState("");

  useEffect(() => { setLocal(attractions); }, [attractions]);

  const days = trip.startDate && trip.endDate
    ? getTripDays(trip.startDate, trip.endDate)
    : [];

  const unscheduled = local.filter((a) => !a.plannedDate);
  const scheduled = local.filter((a) => !!a.plannedDate);
  const totalSpend = calcTotalSpend(scheduled);
  const totalMinsAll = calcTotalMinutes(scheduled);

  // Fix #1 — throw on non-OK so catch blocks actually fire
  async function putAttraction(id: string, patch: Partial<Attraction>) {
    const res = await fetch(`/api/attractions/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`Save failed (${res.status})`);
  }

  function applyOptimistic(updated: Attraction[]) {
    setLocal(updated);
    onAttractionsChange(updated);
  }

  async function handleAssign(attractionId: string, dayIso: string) {
    if (!dayIso) return;
    setSaveError("");
    const snapshot = [...local];
    const updated = local.map((a) =>
      a._id === attractionId ? { ...a, plannedDate: dayIso, plannedTime: null } : a
    );
    applyOptimistic(updated);
    try {
      await putAttraction(attractionId, { plannedDate: dayIso, plannedTime: null });
    } catch (e) {
      applyOptimistic(snapshot);
      setSaveError((e as Error).message);
    }
  }

  async function handleUnassign(attractionId: string) {
    setSaveError("");
    const snapshot = [...local];
    const updated = local.map((a) =>
      a._id === attractionId ? { ...a, plannedDate: null, plannedTime: null } : a
    );
    applyOptimistic(updated);
    try {
      await putAttraction(attractionId, { plannedDate: null, plannedTime: null });
    } catch (e) {
      applyOptimistic(snapshot);
      setSaveError((e as Error).message);
    }
  }

  async function handleTimeChange(attractionId: string, time: string) {
    setSaveError("");
    const snapshot = [...local];
    const updated = local.map((a) =>
      a._id === attractionId ? { ...a, plannedTime: time || null } : a
    );
    applyOptimistic(updated);
    try {
      await putAttraction(attractionId, { plannedTime: time || null });
    } catch (e) {
      applyOptimistic(snapshot);
      setSaveError((e as Error).message);
    }
  }

  function handleDurationLocalChange(id: string, value: string, unit: "minutes" | "hours") {
    setLocal((prev) =>
      prev.map((a) =>
        a._id === id ? { ...a, actualDurationValue: value, actualDurationUnit: unit } : a
      )
    );
  }

  async function handleDurationBlur(id: string, value: string, unit: "minutes" | "hours") {
    setSaveError("");
    const updated = local.map((a) =>
      a._id === id ? { ...a, actualDurationValue: value, actualDurationUnit: unit } : a
    );
    onAttractionsChange(updated);
    try {
      await putAttraction(id, {
        actualDurationValue: value || undefined,
        actualDurationUnit: unit,
      });
    } catch (e) {
      setSaveError((e as Error).message);
    }
  }

  if (attractions.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.sectionHeadingRow}>
          <div className={styles.sectionIconCircle}><Calendar size={18} aria-hidden="true" /></div>
          <h2 className={styles.sectionHeading}>Trip Itinerary</h2>
        </div>
        <div className={styles.emptyState}>
          <Calendar size={36} className={styles.emptyIcon} aria-hidden="true" />
          <p className={styles.emptyText}>Add attractions to start planning your itinerary.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      {/* Section heading + global budget summary */}
      <div className={styles.sectionHeadingRow}>
        <div className={styles.sectionIconCircle}><Calendar size={18} aria-hidden="true" /></div>
        <h2 className={styles.sectionHeading}>Trip Itinerary</h2>
        <div className={styles.summaryBadges}>
          <span className={styles.summaryBadge}>
            <Clock size={12} aria-hidden="true" />
            {fmt(totalMinsAll / 60)}h total
          </span>
          {/* Fix #3 — budget is for the whole trip, not divided per day */}
          {trip.budget ? (
            <span className={`${styles.summaryBadge} ${totalSpend > trip.budget ? styles.budgetOver : ""}`}>
              {trip.currency ?? "$"}{totalSpend.toFixed(0)} / {trip.currency ?? "$"}{trip.budget.toLocaleString()} budget
            </span>
          ) : null}
        </div>
      </div>

      {saveError && (
        <p className={styles.saveError} role="alert">{saveError}</p>
      )}

      <div className={styles.calendarBody}>
        {/* Fix #2 — Unscheduled panel only shown to owner */}
        {isOwner && (
          <div className={styles.unscheduledPanel}>
            <p className={styles.panelLabel}>Unscheduled ({unscheduled.length})</p>
            {unscheduled.length === 0 ? (
              <p className={styles.panelEmpty}>All attractions scheduled!</p>
            ) : (
              unscheduled.map((a) => {
                const icon = ICONS[a.types?.[0] as AttractionType];
                return (
                  <div key={a._id} className={styles.unscheduledCard}>
                    <div className={styles.cardTopRow}>
                      <div className={styles.typeIconCircle} aria-hidden="true">{icon}</div>
                      <span className={styles.cardName}>{a.name}</span>
                    </div>
                    {a.durationValue && (
                      <span className={styles.recDuration}>
                        Recommended: {a.durationValue} {a.durationUnit}
                      </span>
                    )}
                    <select
                      className={styles.assignSelect}
                      defaultValue=""
                      aria-label={`Assign ${a.name} to a day`}
                      onChange={(e) => handleAssign(a._id, e.target.value)}
                    >
                      <option value="" disabled>Assign to day…</option>
                      {days.map((day) => (
                        <option key={day} value={day}>{formatDayLabel(day)}</option>
                      ))}
                    </select>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Fix #4 — Day columns with hourly time axis */}
        <div className={styles.dayColumnsWrapper} role="region" aria-label="Itinerary calendar">
          <div className={styles.dayColumns}>
            {days.map((dayIso) => {
              const assigned = local.filter((a) => a.plannedDate === dayIso);
              const timedAttractions = assigned.filter((a) => a.plannedTime);
              const untimedAttractions = assigned.filter((a) => !a.plannedTime);
              const totalMins = calcTotalMinutes(assigned);
              const isOverloaded = totalMins > 480;
              const dayLabel = formatDayLabel(dayIso);

              return (
                <div key={dayIso} className={styles.dayColumn}>
                  {/* Column header */}
                  <div className={styles.dayHeader}>
                    <h3 className={styles.dayTitle}>{dayLabel}</h3>
                    <span className={`${styles.dayHours} ${isOverloaded ? styles.dayHoursWarning : ""}`}>
                      {fmt(totalMins / 60)}h
                    </span>
                  </div>

                  {/* Hour-by-hour timeline */}
                  <div className={styles.timeline}>
                    {HOUR_SLOTS.map((slot) => {
                      const slotItems = timedAttractions.filter((a) => a.plannedTime === slot);
                      return (
                        <div key={slot} className={styles.timeSlot}>
                          <span className={styles.timeLabel}>{slot}</span>
                          <div className={styles.slotContent}>
                            {slotItems.map((a) => (
                              <AttractionCardInSlot
                                key={a._id}
                                attraction={a}
                                dayLabel={dayLabel}
                                isOwner={isOwner}
                                onUnassign={() => handleUnassign(a._id)}
                                onTimeChange={(t) => handleTimeChange(a._id, t)}
                                onDurationLocalChange={(v, u) => handleDurationLocalChange(a._id, v, u)}
                                onDurationBlur={(v, u) => handleDurationBlur(a._id, v, u)}
                                days={days}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Attractions without a time */}
                  {untimedAttractions.length > 0 && (
                    <div className={styles.untimedSection}>
                      <p className={styles.untimedLabel}>No time set</p>
                      {untimedAttractions.map((a) => (
                        <AttractionCardInSlot
                          key={a._id}
                          attraction={a}
                          dayLabel={dayLabel}
                          isOwner={isOwner}
                          onUnassign={() => handleUnassign(a._id)}
                          onTimeChange={(t) => handleTimeChange(a._id, t)}
                          onDurationLocalChange={(v, u) => handleDurationLocalChange(a._id, v, u)}
                          onDurationBlur={(v, u) => handleDurationBlur(a._id, v, u)}
                          days={days}
                        />
                      ))}
                    </div>
                  )}

                  {assigned.length === 0 && (
                    <div className={styles.dayEmpty}>No attractions</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Attraction card sub-component ─────────────────────────────────────────────

interface AttractionCardProps {
  attraction: Attraction;
  dayLabel: string;
  isOwner: boolean;
  onUnassign: () => void;
  onTimeChange: (time: string) => void;
  onDurationLocalChange: (value: string, unit: "minutes" | "hours") => void;
  onDurationBlur: (value: string, unit: "minutes" | "hours") => void;
  days: string[];
}

function AttractionCardInSlot({
  attraction: a,
  dayLabel,
  isOwner,
  onUnassign,
  onTimeChange,
  onDurationLocalChange,
  onDurationBlur,
}: AttractionCardProps) {
  const icon = ICONS[a.types?.[0] as AttractionType];

  return (
    <div className={styles.dayAttractionCard}>
      {isOwner && (
        <button
          type="button"
          className={styles.unassignBtn}
          onClick={onUnassign}
          aria-label={`Remove ${a.name} from ${dayLabel}`}
        >
          <X size={12} aria-hidden="true" />
        </button>
      )}
      <div className={styles.cardTopRow}>
        <div className={styles.typeIconCircle} aria-hidden="true">{icon}</div>
        <span className={styles.cardName}>{a.name}</span>
      </div>
      {a.durationValue && (
        <span className={styles.recDuration}>Rec: {a.durationValue} {a.durationUnit}</span>
      )}
      {/* Time selector */}
      {isOwner && (
        <select
          className={styles.timeSelect}
          value={a.plannedTime ?? ""}
          aria-label={`Start time for ${a.name}`}
          onChange={(e) => onTimeChange(e.target.value)}
        >
          <option value="">Set time…</option>
          {HOUR_SLOTS.map((slot) => (
            <option key={slot} value={slot}>{slot}</option>
          ))}
        </select>
      )}
      {!isOwner && a.plannedTime && (
        <span className={styles.recDuration}>{a.plannedTime}</span>
      )}
      {/* Planned duration */}
      {isOwner && (
        <div className={styles.durationRow}>
          <span className={styles.durationLabel}>Planned:</span>
          <input
            type="number"
            min="0"
            step="1"
            className={styles.durationInput}
            value={a.actualDurationValue ?? ""}
            aria-label={`Planned duration for ${a.name}`}
            onChange={(e) => onDurationLocalChange(e.target.value, a.actualDurationUnit ?? "hours")}
            onBlur={(e) => onDurationBlur(e.target.value, a.actualDurationUnit ?? "hours")}
          />
          <select
            className={styles.unitSelect}
            value={a.actualDurationUnit ?? "hours"}
            aria-label={`Duration unit for ${a.name}`}
            onChange={(e) => {
              const unit = e.target.value as "minutes" | "hours";
              onDurationLocalChange(a.actualDurationValue ?? "", unit);
              onDurationBlur(a.actualDurationValue ?? "", unit);
            }}
          >
            <option value="minutes">min</option>
            <option value="hours">h</option>
          </select>
        </div>
      )}
      {!isOwner && a.actualDurationValue && (
        <span className={styles.recDuration}>
          Planned: {a.actualDurationValue} {a.actualDurationUnit ?? "h"}
        </span>
      )}
    </div>
  );
}
