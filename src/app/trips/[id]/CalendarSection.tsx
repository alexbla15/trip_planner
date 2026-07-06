"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Calendar, Search, X, Clock, Save, Loader2, Map as MapIcon, TriangleAlert } from "lucide-react";
import { renderTypeIcon } from "@/lib/attractionIcons";
import { useAttractionTypes } from "@/hooks/useAttractionTypes";
import { formatPrice } from "@/lib/formatCurrency";
import {
  DEFAULT_DAY_START,
  DEFAULT_DAY_END,
  SLOT_HEIGHT_PX,
  MIN_CARD_HEIGHT_PX,
  MIN_BLOCK_WIDTH_PX,
  MIN_OVERLAP_DURATION_MINS,
} from "@/config/ui";
import type { Trip } from "@/types/trip";
import type { Attraction } from "@/types/attraction";
import { AttractionDetailModal } from "@/components/AttractionDetailModal/AttractionDetailModal";
import { computeAlerts } from "./CalendarSection.utils";
import type { ScheduleAlert } from "./CalendarSection.utils";
import styles from "./CalendarSection.module.css";

const TripDayMapWidget = dynamic(
  () => import("./TripDayMapWidget").then((m) => ({ default: m.TripDayMapWidget })),
  {
    ssr: false,
    loading: () => (
      <div className={styles.mapLoading}>
        <Loader2 size={20} className={styles.spinnerIcon} aria-hidden="true" />
      </div>
    ),
  }
);

/** Hour options for the day-range selects */
const ALL_HOURS = Array.from({ length: 25 }, (_, i) => i); // 0..24

function makeHourSlots(start: number, end: number): string[] {
  return Array.from({ length: end - start }, (_, i) => {
    const h = start + i;
    return `${String(h).padStart(2, "0")}:00`;
  });
}


type SidebarFilter = "all" | "scheduled" | "unscheduled";

// ── Pure utils ────────────────────────────────────────────────────────────────

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
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
  });
}

/** px from timeline top for a "HH:MM" string — supports minutes */
function slotTop(time: string, startHour: number): number {
  const [h, m] = time.split(":").map(Number);
  return ((h - startHour) + (m || 0) / 60) * SLOT_HEIGHT_PX;
}

/** Card height in px from duration */
function cardPx(a: Attraction): number {
  const raw = parseFloat(a.actualDurationValue ?? a.durationValue ?? "");
  if (isNaN(raw) || raw <= 0) return MIN_CARD_HEIGHT_PX;
  const unit = a.actualDurationUnit ?? a.durationUnit ?? "hours";
  const hours = unit === "minutes" ? raw / 60 : raw;
  return Math.max(hours * SLOT_HEIGHT_PX, MIN_CARD_HEIGHT_PX);
}

// ── Overlap layout ────────────────────────────────────────────────────────────


interface LayoutItem {
  attraction: Attraction;
  startMins: number;
  endMins: number;
  col: number;     // 0-based column index within overlapping group
  numCols: number; // total columns in the widest overlap
}

function timeToMins(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function endMins(a: Attraction): number {
  const start = timeToMins(a.plannedTime!);
  const val   = parseFloat(a.actualDurationValue ?? a.durationValue ?? "0");
  const unit  = a.actualDurationUnit ?? a.durationUnit ?? "hours";
  const dur   = unit === "hours" ? val * 60 : val;
  return start + Math.max(dur, MIN_OVERLAP_DURATION_MINS);
}

/**
 * Assigns each timed attraction a column index (col) and the total
 * number of columns it shares with overlapping peers (numCols).
 */
function layoutTimed(timed: Attraction[]): LayoutItem[] {
  if (timed.length === 0) return [];

  const items: LayoutItem[] = timed
    .filter((a) => !!a.plannedTime)
    .map((a) => ({
      attraction: a,
      startMins:  timeToMins(a.plannedTime!),
      endMins:    endMins(a),
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
function findEarliestFreeSlot(timedOnDay: Attraction[], durationMins: number): string {
  const events = timedOnDay
    .filter((a) => !!a.plannedTime)
    .map((a) => ({ start: timeToMins(a.plannedTime!), end: endMins(a) }))
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
function dayColumnWidth(maxOverlap: number): number {
  const LABEL_W = 46; // px for time labels + divider
  const PAD_R   = 4;
  return Math.max(200, LABEL_W + maxOverlap * MIN_BLOCK_WIDTH_PX + PAD_R);
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fix #2 — span from earliest start to latest end across timed attractions.
 * e.g. 9:00–11:00 and 13:00–14:30 → span = 14:30−9:00 = 5.5h, not 2+1.5=3.5h.
 */
function calcDaySpanMinutes(timedItems: Attraction[]): number {
  const timed = timedItems.filter((a) => !!a.plannedTime);
  if (timed.length === 0) return 0;
  const earliest = Math.min(...timed.map((a) => timeToMins(a.plannedTime!)));
  const latest   = Math.max(...timed.map((a) => endMins(a)));
  return Math.max(0, latest - earliest);
}

function calcSpend(items: Attraction[]): number {
  return items.reduce((s, a) => s + (a.price ?? 0), 0);
}

function fmt(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

// ── Popup state type ──────────────────────────────────────────────────────────

interface PopupState {
  attractionId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  plannedTime: string;
  durationValue: string;
  durationUnit: "minutes" | "hours";
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CalendarSectionProps {
  trip: Trip;
  attractions: Attraction[];
  onAttractionsChange: (updated: Attraction[]) => void;
  token: string;
  canEdit: boolean;
}

export function CalendarSection({ trip, attractions, onAttractionsChange, token, canEdit }: CalendarSectionProps) {
  const { colorForType, findType } = useAttractionTypes();
  const [local, setLocal]         = useState<Attraction[]>(attractions);
  const [pending, setPending]     = useState<Map<string, Partial<Attraction>>>(new Map());
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedOk, setSavedOk]     = useState(false);
  const [popup, setPopup]         = useState<PopupState | null>(null);

  const [showMap, setShowMap]                  = useState(false);
  const [dismissedAlerts, setDismissedAlerts]  = useState<Set<string>>(new Set());
  const [viewingAttraction, setViewingAttraction] = useState<Attraction | null>(null);

  // Day-range controls (view only — persisted locally)
  const [dayStart, setDayStart]   = useState(DEFAULT_DAY_START);
  const [dayEnd, setDayEnd]       = useState(DEFAULT_DAY_END);

  // Sidebar
  const [filter, setFilter]       = useState<SidebarFilter>("unscheduled");
  const [search, setSearch]       = useState("");

  const [totalSpend, setTotalSpend] = useState(0);

  // Sync local state whenever the parent re-fetches / updates attractions
  useEffect(() => { setLocal(attractions); }, [attractions]);

  // Clear dismissed alerts on every mutation so re-triggered conditions re-appear
  useEffect(() => { setDismissedAlerts(new Set()); }, [local]);

  const days        = trip.startDate && trip.endDate ? getTripDays(trip.startDate, trip.endDate) : [];
  const scheduled   = local.filter((a) => !!a.plannedDate);
  const unscheduled = local.filter((a) => !a.plannedDate);
  const hourSlots   = makeHourSlots(dayStart, dayEnd);

  // Convert each scheduled attraction from its own currency to the trip currency before summing
  useEffect(() => {
    const tc = trip.currency ?? "USD";
    const raw = calcSpend(scheduled);
    setTotalSpend(raw);

    const foreignCurrencies = [...new Set(
      scheduled.filter((a) => a.price != null && a.currency && a.currency !== tc).map((a) => a.currency!)
    )];
    if (foreignCurrencies.length === 0) return;

    let cancelled = false;
    Promise.all(
      foreignCurrencies.map(async (from) => {
        const res = await fetch(`/api/fx?from=${encodeURIComponent(from)}&to=${encodeURIComponent(tc)}`);
        const d = await res.json() as { rate?: number };
        return [from, d.rate ?? 1] as [string, number];
      })
    ).then((entries) => {
      if (cancelled) return;
      const rates = new Map(entries);
      const converted = scheduled.reduce((sum, a) => {
        if (a.price == null) return sum;
        const cur = a.currency ?? tc;
        return sum + a.price * (cur === tc ? 1 : (rates.get(cur) ?? 1));
      }, 0);
      setTotalSpend(Math.round(converted * 100) / 100);
    }).catch(() => { /* keep raw sum on error */ });

    return () => { cancelled = true; };
  }, [local, trip.currency]); // eslint-disable-line react-hooks/exhaustive-deps

  const sidebarList = useMemo(() => {
    let list = local;
    if (filter === "scheduled")   list = scheduled;
    if (filter === "unscheduled") list = unscheduled;
    const q = search.trim().toLowerCase();
    return q ? list.filter((a) => a.name.toLowerCase().includes(q)) : list;
  }, [local, scheduled, unscheduled, filter, search]);

  const alerts: ScheduleAlert[] = useMemo(
    () => (canEdit ? computeAlerts(local, dayStart, dayEnd) : []),
    [local, dayStart, dayEnd, canEdit]
  );
  const visibleAlerts = alerts.filter((a) => !dismissedAlerts.has(a.id));

  // ── API ───────────────────────────────────────────────────────────────────

  async function putOne(id: string, patch: Partial<Attraction>) {
    // Schedule fields (plannedDate, plannedTime, actualDuration) live in Trip.schedules,
    // so we PATCH the trip-scoped schedule endpoint rather than the global attraction.
    const res = await fetch(`/api/trips/${trip._id}/attractions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`Save failed (${res.status})`);
  }

  function addPending(id: string, patch: Partial<Attraction>) {
    setPending((prev) => {
      const next = new Map(prev);
      next.set(id, { ...(next.get(id) ?? {}), ...patch });
      return next;
    });
  }

  function applyLocal(updated: Attraction[]) {
    setLocal(updated);
    onAttractionsChange(updated);
  }

  // ── Batch save (Fix #1) ─────────────────────────────────────────────────────

  async function handleSaveAll() {
    // Guard: nothing pending
    if (pending.size === 0) {
      setSaveError("No unsaved changes.");
      return;
    }
    // Guard: no token
    if (!token) {
      setSaveError("Not authenticated — please refresh the page.");
      return;
    }
    setSaving(true);
    setSaveError("");
    setSavedOk(false);
    try {
      await Promise.all(
        [...pending.entries()].map(([id, patch]) => putOne(id, patch))
      );
      setPending(new Map());
      setSavedOk(true);
      // Auto-clear success feedback after 3s
      setTimeout(() => setSavedOk(false), 3000);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // ── Assign / Unassign (now just local + pending, no immediate PUT) ─────────

  function handleAssign(id: string, dayIso: string) {
    if (!dayIso) return;

    // Resolve the attraction's duration in minutes
    const attraction  = local.find((a) => a._id === id);
    const rawVal      = parseFloat(attraction?.actualDurationValue ?? attraction?.durationValue ?? "");
    const unit        = attraction?.actualDurationUnit ?? attraction?.durationUnit ?? "hours";
    const durationMins = isNaN(rawVal) || rawVal <= 0 ? 60 : unit === "hours" ? rawVal * 60 : rawVal;

    // Find all already-timed attractions on this day (excluding the one being moved)
    const timedOnDay = local.filter((a) => a.plannedDate === dayIso && !!a.plannedTime && a._id !== id);

    // Auto-schedule at the earliest free slot
    const plannedTime = findEarliestFreeSlot(timedOnDay, durationMins);

    const patch = { plannedDate: dayIso, plannedTime };
    applyLocal(local.map((a) => a._id === id ? { ...a, ...patch } : a));
    addPending(id, patch);
  }

  function handleUnassign(id: string) {
    const patch = { plannedDate: null, plannedTime: null };
    applyLocal(local.map((a) => a._id === id ? { ...a, ...patch } : a));
    addPending(id, patch);
  }

  // ── Change 1: Apply popup edits ────────────────────────────────────────────

  function applyPopup() {
    if (!popup) return;
    const { attractionId, plannedTime, durationValue, durationUnit } = popup;
    const patch: Partial<Attraction> = {
      plannedTime: plannedTime || null,
      actualDurationValue: durationValue || undefined,
      actualDurationUnit: durationUnit,
    };
    applyLocal(local.map((a) => a._id === attractionId ? { ...a, ...patch } : a));
    addPending(attractionId, patch);
    setPopup(null);
  }

  function openPopup(e: React.MouseEvent, a: Attraction) {
    e.stopPropagation();
    const POPUP_W = 230;
    const POPUP_H = 260;
    const rawX = e.clientX + 12;
    const rawY = e.clientY - 20;
    const x = Math.min(rawX, window.innerWidth  - POPUP_W - 8);
    const y = Math.min(rawY, window.innerHeight - POPUP_H - 8);
    setPopup({
      attractionId: a._id,
      name: a.name,
      color: colorForType(a.types?.[0] ?? ""),
      x: Math.max(8, x),
      y: Math.max(8, y),
      plannedTime:   a.plannedTime   ?? "",
      durationValue: a.actualDurationValue ?? a.durationValue ?? "",
      durationUnit:  a.actualDurationUnit  ?? a.durationUnit  ?? "hours",
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const hasPending = pending.size > 0;

  const headerProps = {
    totalSpend, trip, canEdit,
    hasPending, saving, savedOk,
    dayStart, dayEnd,
    showMap,
    onSave: handleSaveAll,
    onDayStartChange: setDayStart,
    onDayEndChange: setDayEnd,
    onToggleMap: () => setShowMap((v) => !v),
  };

  if (attractions.length === 0) {
    return (
      <div className={styles.card}>
        <Header {...headerProps} hasPending={false} saving={false} savedOk={false} onSave={() => {}} />
        <div className={styles.emptyState}>
          <Calendar size={36} className={styles.emptyIcon} aria-hidden="true" />
          <p className={styles.emptyText}>
            {canEdit ? "Add attractions to start planning your itinerary." : "No itinerary scheduled yet."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.card}>
        <Header {...headerProps} />

        {saveError && <p className={styles.saveError} role="alert">{saveError}</p>}
        {canEdit && hasPending && !saving && (
          <p className={styles.pendingHint}>{pending.size} unsaved change{pending.size > 1 ? "s" : ""} — click Save to persist.</p>
        )}

        {visibleAlerts.map((alert) => (
          <div key={alert.id} className={styles.alertBanner} role="alert">
            <TriangleAlert size={14} className={styles.alertIcon} aria-hidden="true" />
            <span className={styles.alertMessage}>{alert.message}</span>
            <button
              type="button"
              className={styles.alertDismiss}
              onClick={() => setDismissedAlerts((prev) => new Set([...prev, alert.id]))}
              aria-label="Dismiss warning"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>
        ))}

        <div className={styles.calendarBody}>
          {/* ── Sidebar — OWNER ONLY (Fix: read-only mode hides picker) ── */}
          {canEdit && <div className={styles.sidebar}>
            <div className={styles.searchWrapper}>
              <Search size={13} className={styles.searchIcon} aria-hidden="true" />
              <input type="search" className={styles.searchInput}
                placeholder="Search attractions…" value={search}
                onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
            </div>

            <div className={styles.filterChips} role="group" aria-label="Filter">
              {(["all", "unscheduled", "scheduled"] as SidebarFilter[]).map((f) => (
                <button key={f} type="button"
                  className={`${styles.filterChip} ${filter === f ? styles.filterChipActive : ""}`}
                  aria-pressed={filter === f} onClick={() => setFilter(f)}
                >
                  {f === "all" ? `All (${local.length})`
                    : f === "unscheduled" ? `Unsched. (${unscheduled.length})`
                    : `Sched. (${scheduled.length})`}
                </button>
              ))}
            </div>

            <div className={styles.sidebarList}>
              {sidebarList.length === 0 ? (
                <p className={styles.panelEmpty}>No attractions match.</p>
              ) : sidebarList.map((a) => {
                const icon = renderTypeIcon(findType(a.types?.[0] ?? "")?.icon ?? "");
                const isScheduled = !!a.plannedDate;
                const color = colorForType(a.types?.[0] ?? "");
                return (
                  <div key={a._id}
                    className={`${styles.sidebarCard} ${isScheduled ? styles.sidebarCardScheduled : ""}`}
                    style={{ ["--type-color" as string]: color }}
                  >
                    <div className={styles.cardTopRow}>
                      <div className={styles.typeIconCircle} aria-hidden="true">{icon}</div>
                      <span className={styles.cardName}>{a.name}</span>
                    </div>
                    {isScheduled && a.plannedDate && (
                      <span className={styles.dayBadge}>
                        {formatDayLabel(a.plannedDate)}{a.plannedTime ? ` · ${a.plannedTime}` : ""}
                      </span>
                    )}
                    {a.durationValue && (
                      <span className={styles.recDuration}>Rec: {a.durationValue} {a.durationUnit}</span>
                    )}
                    {canEdit && (
                      <select className={styles.assignSelect}
                        value={a.plannedDate ?? ""}
                        aria-label={`${isScheduled ? "Reassign" : "Assign"} ${a.name}`}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "__unassign__") handleUnassign(a._id);
                          else handleAssign(a._id, val);
                        }}
                      >
                        <option value="" disabled={isScheduled}>
                          {isScheduled ? "Move to day…" : "Assign to day…"}
                        </option>
                        {isScheduled && <option value="__unassign__">— Unassign</option>}
                        {days.map((day) => (
                          <option key={day} value={day}>{formatDayLabel(day)}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>}

          {/* ── Day columns (shown to everyone) ── */}
          <div className={styles.dayColumnsWrapper} role="region" aria-label="Itinerary calendar">
            <div className={styles.dayColumns}>
              {days.map((dayIso) => {
                const dayAttractions = local.filter((a) => a.plannedDate === dayIso);
                const untimed = dayAttractions.filter((a) => !a.plannedTime);
                const dayMins = calcDaySpanMinutes(dayAttractions.filter((a) => !!a.plannedTime));
                const isOverloaded = dayMins > 480;
                const dayLabel = formatDayLabel(dayIso);

                // Overlap-aware layout
                const layout     = layoutTimed(dayAttractions);
                const maxOverlap = layout.length > 0 ? Math.max(...layout.map((l) => l.numCols)) : 1;
                const colWidth   = dayColumnWidth(maxOverlap);
                const LABEL_W    = 46;
                const PAD_R      = 4;
                const availW     = colWidth - LABEL_W - PAD_R;

                return (
                  <div key={dayIso} className={styles.dayColumn}
                    style={{ ["--day-width" as string]: `${colWidth}px` }}>
                    <div className={styles.dayHeader}>
                      <h3 className={styles.dayTitle}>{dayLabel}</h3>
                      <span className={`${styles.dayHours} ${isOverloaded ? styles.dayHoursWarning : ""}`}>
                        {fmt(dayMins / 60)}h
                      </span>
                    </div>

                    {/* Timeline — dynamic hour range */}
                    <div className={styles.timeline}
                      style={{ ["--slot-height" as string]: `${SLOT_HEIGHT_PX}px`, ["--num-slots" as string]: String(dayEnd - dayStart) }}>
                      {hourSlots.map((slot, idx) => (
                        <div key={slot} className={styles.hourGuide}
                          style={{ ["--guide-idx" as string]: String(idx) }}>
                          <span className={styles.timeLabel}>{slot}</span>
                          <div className={styles.hourLine} />
                        </div>
                      ))}

                      {/* Side-by-side overlap layout */}
                      {layout.map(({ attraction: a, col, numCols }) => {
                        if (!a.plannedTime) return null;
                        const top       = slotTop(a.plannedTime, dayStart);
                        const height    = cardPx(a);
                        const color     = colorForType(a.types?.[0] ?? "");
                        const icon      = renderTypeIcon(findType(a.types?.[0] ?? "")?.icon ?? "");
                        const isPending = pending.has(a._id);
                        const blockW    = availW / numCols;
                        const blockL    = LABEL_W + col * blockW;
                        const isCompact = height < SLOT_HEIGHT_PX;

                        // Detect flight by subtype OR by type tag (handles entries created before subtype was added)
                        const isFlight = a.subtype === "flight" || a.types?.[0] === "Flight";
                        const blockLabel = isFlight && a.departureAirport && a.arrivalAirport
                          ? `${a.departureAirport} → ${a.arrivalAirport}`
                          : a.name;

                        function handleBlockClick(e: React.MouseEvent) {
                          // Subtype entries (residence, flight) always open detail modal
                          if (a.subtype || isFlight) { setViewingAttraction(a); return; }
                          if (canEdit) openPopup(e, a);
                          else setViewingAttraction(a);
                        }

                        return (
                          <div
                            key={a._id}
                            className={`${styles.attractionBlock} ${isPending ? styles.blockPending : ""} ${isCompact ? styles.blockCompact : ""}`}
                            style={{
                              ["--block-top"    as string]: `${top}px`,
                              ["--block-height" as string]: `${height}px`,
                              ["--block-color"  as string]: color,
                              ["--block-left"   as string]: `${blockL}px`,
                              ["--block-width"  as string]: `${blockW - 3}px`,
                            }}
                            role="button"
                            tabIndex={0}
                            onClick={handleBlockClick}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleBlockClick(e as unknown as React.MouseEvent);
                              }
                            }}
                            aria-label={`${a.name} at ${a.plannedTime}${!a.subtype && !isFlight && canEdit ? " — click to edit" : " — click to view details"}`}
                          >
                            <div className={styles.blockTopRow}>
                              {icon && <span className={styles.blockIcon} aria-hidden="true">{icon}</span>}
                              <span className={styles.blockTime}>{a.plannedTime}</span>
                            </div>
                            <span className={styles.blockName}>{blockLabel}</span>
                            {canEdit && (
                              <button type="button" className={styles.unassignBtnBlock}
                                onClick={(e) => { e.stopPropagation(); handleUnassign(a._id); }}
                                aria-label={`Remove ${a.name}`}>
                                <X size={9} aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Untimed */}
                    {untimed.length > 0 && (
                      <div className={styles.untimedSection}>
                        <p className={styles.untimedLabel}>No time ({untimed.length})</p>
                        {untimed.map((a) => {
                          const icon = renderTypeIcon(findType(a.types?.[0] ?? "")?.icon ?? "");
                          const color = colorForType(a.types?.[0] ?? "");
                          return (
                            <div key={a._id} className={styles.untimedCard}
                              style={{ ["--type-color" as string]: color }}>
                              <div className={styles.cardTopRow}>
                                <div className={styles.typeIconCircle} aria-hidden="true">{icon}</div>
                                <span className={styles.cardName}>{a.name}</span>
                                {canEdit && (
                                  <button type="button" className={styles.unassignBtnSmall}
                                    onClick={() => handleUnassign(a._id)} aria-label={`Remove ${a.name}`}>
                                    <X size={10} aria-hidden="true" />
                                  </button>
                                )}
                              </div>
                              {canEdit && (
                                <button type="button" className={styles.setTimeBtn}
                                  onClick={(e) => openPopup(e, a)}>
                                  <Clock size={11} aria-hidden="true" />
                                  Set time & duration
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {dayAttractions.length === 0 && (
                      <div className={styles.dayEmpty}>No attractions</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {showMap && (
          <div className={styles.mapSection}>
            <TripDayMapWidget trip={trip} attractions={local} />
          </div>
        )}
      </div>

      {/* Change 1: Edit popup — rendered outside card to avoid clipping */}
      {popup && canEdit && (
        <>
          <div className={styles.popupBackdrop} onClick={() => setPopup(null)} />
          <div
            className={styles.popup}
            style={{
              ["--popup-x" as string]: `${popup.x}px`,
              ["--popup-y" as string]: `${popup.y}px`,
            }}
            role="dialog"
            aria-label={`Edit ${popup.name}`}
          >
            <div className={styles.popupHeader} style={{ ["--popup-color" as string]: popup.color }}>
              <span className={styles.popupTitle}>{popup.name}</span>
              <button type="button" className={styles.popupClose} onClick={() => setPopup(null)} aria-label="Close">
                <X size={14} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.popupBody}>
              <label className={styles.popupLabel} htmlFor="popup-time">Start time</label>
              <input
                id="popup-time"
                type="time"
                className={styles.popupInput}
                value={popup.plannedTime}
                onChange={(e) => setPopup((p) => p ? { ...p, plannedTime: e.target.value } : p)}
              />
              <label className={styles.popupLabel}>Duration</label>
              <div className={styles.popupDurRow}>
                <input
                  type="number" min="0" step="0.5"
                  className={styles.popupDurInput}
                  value={popup.durationValue}
                  onChange={(e) => setPopup((p) => p ? { ...p, durationValue: e.target.value } : p)}
                  aria-label="Duration value"
                />
                <select
                  className={styles.popupDurUnit}
                  value={popup.durationUnit}
                  onChange={(e) => setPopup((p) => p ? { ...p, durationUnit: e.target.value as "minutes" | "hours" } : p)}
                  aria-label="Duration unit"
                >
                  <option value="hours">hours</option>
                  <option value="minutes">minutes</option>
                </select>
              </div>
              <div className={styles.popupActions}>
                <button type="button" className={styles.popupCancel} onClick={() => setPopup(null)}>Cancel</button>
                <button type="button" className={styles.popupApply} onClick={applyPopup}>
                  <Clock size={13} aria-hidden="true" />
                  Apply
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Attraction detail modal — triggered by clicking a calendar block */}
      <AttractionDetailModal
        attraction={viewingAttraction}
        onClose={() => setViewingAttraction(null)}
      />
    </>
  );
}

// ── Header sub-component ──────────────────────────────────────────────────────

interface HeaderProps {
  totalSpend: number;
  trip: Trip;
  canEdit: boolean;
  hasPending: boolean;
  saving: boolean;
  savedOk: boolean;
  dayStart: number;
  dayEnd: number;
  showMap: boolean;
  onSave: () => void;
  onDayStartChange: (h: number) => void;
  onDayEndChange: (h: number) => void;
  onToggleMap: () => void;
}

function Header({
  totalSpend, trip, canEdit,
  hasPending, saving, savedOk,
  dayStart, dayEnd,
  showMap,
  onSave, onDayStartChange, onDayEndChange, onToggleMap,
}: HeaderProps) {
  return (
    <div className={styles.sectionHeadingRow}>
      <div className={styles.sectionIconCircle}><Calendar size={18} aria-hidden="true" /></div>
      <h2 className={styles.sectionHeading}>Trip Itinerary</h2>

      {/* Day time range controls */}
      <div className={styles.rangeControls}>
        <label className={styles.rangeLabel} htmlFor="day-start">From</label>
        <select id="day-start" className={styles.rangeSelect}
          value={dayStart}
          onChange={(e) => onDayStartChange(Number(e.target.value))}>
          {ALL_HOURS.filter(h => h < dayEnd).map(h => (
            <option key={h} value={h}>{String(h).padStart(2,"0")}:00</option>
          ))}
        </select>
        <label className={styles.rangeLabel} htmlFor="day-end">To</label>
        <select id="day-end" className={styles.rangeSelect}
          value={dayEnd}
          onChange={(e) => onDayEndChange(Number(e.target.value))}>
          {ALL_HOURS.filter(h => h > dayStart).map(h => (
            <option key={h} value={h}>{String(h).padStart(2,"0")}:00</option>
          ))}
        </select>
      </div>

      <div className={styles.summaryBadges}>
        {trip.budget ? (
          <div className={`${styles.budgetWidget} ${totalSpend > trip.budget ? styles.budgetWidgetOver : ""}`}>
            <div className={styles.budgetWidgetRow}>
              <span className={styles.budgetSpent}>{formatPrice(totalSpend.toLocaleString(), trip.currency ?? "USD")}</span>
              <span className={styles.budgetOf}>of {formatPrice(trip.budget.toLocaleString(), trip.currency ?? "USD")}</span>
            </div>
            <div className={styles.budgetTrack}>
              <div className={styles.budgetFill}
                style={{ ["--fill" as string]: `${Math.min((totalSpend / trip.budget) * 100, 100).toFixed(1)}%` }} />
            </div>
          </div>
        ) : null}

        {/* Map view toggle */}
        <button
          type="button"
          className={`${styles.mapToggleBtn} ${showMap ? styles.mapToggleBtnActive : ""}`}
          onClick={onToggleMap}
          aria-pressed={showMap}
          aria-label={showMap ? "Hide map view" : "Show map view"}
        >
          <MapIcon size={14} aria-hidden="true" />
          Map
        </button>

        {/* Save button — OWNER ONLY (Fix: read-only hides save) */}
        {canEdit && (
          <button
            type="button"
            className={`${styles.saveBtn} ${hasPending ? styles.saveBtnActive : ""} ${savedOk ? styles.saveBtnOk : ""}`}
            onClick={onSave}
            disabled={saving}
            aria-label={hasPending ? "Save itinerary changes" : "No unsaved changes"}
          >
            {saving
              ? <><Loader2 size={13} className={styles.spinnerIcon} aria-hidden="true" /> Saving…</>
              : savedOk
                ? <><Save size={13} aria-hidden="true" /> Saved ✓</>
                : <><Save size={13} aria-hidden="true" /> {hasPending ? "Save *" : "Save"}</>}
          </button>
        )}
      </div>
    </div>
  );
}
