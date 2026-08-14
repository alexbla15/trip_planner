"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Calendar, Search, X, Clock, Save, Loader2, Map as MapIcon, TriangleAlert, Plus, Coffee } from "lucide-react";
import { renderTypeIcon, AttractionDetailModal, AddCustomSlotModal } from "@/components";
import type { CustomSlotFormData } from "@/components";
import { useAttractionTypes } from "@/hooks";
import { useToast } from "@/contexts/ToastContext";
import {
  getFxRate,
  updateTrip,
  addAttractionToTrip,
  updateTripAttractionSchedule,
  removeAttractionFromTrip,
} from "@/services";
import {
  formatPrice,
  getTripDays,
  formatDayLabel,
  makeHourSlots,
  slotTop,
  cardPx,
  layoutTimed,
  findEarliestFreeSlot,
  dayColumnWidth,
  calcDaySpanMinutes,
  calcSpend,
  fmt,
  attractionEndMins,
} from "@/lib";
import {
  DEFAULT_DAY_START,
  DEFAULT_DAY_END,
  SLOT_HEIGHT_PX,
} from "@/config/ui";
import type { Trip } from "@/types/trip";
import type { Attraction } from "@/types/attraction";
import { computeAlerts, computeScheduleHourBounds } from "./CalendarSection.utils";
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

type SidebarFilter = "all" | "scheduled" | "unscheduled";

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
  const toast = useToast();
  const [local, setLocal]         = useState<Attraction[]>(attractions);
  const [pending, setPending]     = useState<Map<string, Partial<Attraction>>>(new Map());
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedOk, setSavedOk]     = useState(false);
  const [popup, setPopup]         = useState<PopupState | null>(null);

  const [showMap, setShowMap]                  = useState(false);
  const [dismissedAlerts, setDismissedAlerts]  = useState<Set<string>>(new Set());
  const [viewingAttraction, setViewingAttraction] = useState<Attraction | null>(null);
  const [customSlotModalOpen, setCustomSlotModalOpen] = useState(false);
  const [editingCustomSlot, setEditingCustomSlot]     = useState<Attraction | null>(null);

  // Day-range controls — initialized from DB (calDayStart/calDayEnd) if the user has
  // already customized it; otherwise fit the window to the earliest start / latest end
  // across the whole schedule (rounded out to whole hours), falling back to the fixed
  // defaults only when nothing is scheduled yet. Computed once via the lazy useState
  // initializer — later changes to `attractions` must not retroactively resize a window
  // the user (or a prior save) may have already set.
  const [dayStart, setDayStart] = useState(() => {
    if (trip.calDayStart != null) return trip.calDayStart;
    const bounds = computeScheduleHourBounds(attractions);
    return bounds?.start ?? DEFAULT_DAY_START;
  });
  const [dayEnd, setDayEnd] = useState(() => {
    if (trip.calDayEnd != null) return trip.calDayEnd;
    const bounds = computeScheduleHourBounds(attractions);
    return bounds?.end ?? DEFAULT_DAY_END;
  });

  // Sidebar
  const [filter, setFilter]       = useState<SidebarFilter>("unscheduled");
  const [search, setSearch]       = useState("");

  // Mobile swipe carousel — tracks which day is visible
  const [mobileDayIdx, setMobileDayIdx] = useState(0);
  const pointerStartX = useRef<number | null>(null);
  const pointerStartY = useRef<number | null>(null);
  const daysCountRef  = useRef(0); // always-current; updated each render below

  const [totalSpend, setTotalSpend] = useState(0);

  // Sync local state whenever the parent re-fetches / updates attractions
  useEffect(() => { setLocal(attractions); }, [attractions]);

  // Clear dismissed alerts on every mutation so re-triggered conditions re-appear
  useEffect(() => { setDismissedAlerts(new Set()); }, [local]);

  const days = trip.startDate && trip.endDate ? getTripDays(trip.startDate, trip.endDate) : [];
  daysCountRef.current = days.length; // keep ref in sync every render


  // Custom slots are always scheduled (schedule-only entries) — exclude from sidebar counts
  const regularAttractions = local.filter((a) => a.subtype !== "custom-slot");
  const scheduled   = regularAttractions.filter((a) => !!a.plannedDate);
  const unscheduled = regularAttractions.filter((a) => !a.plannedDate);
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
        const d = await getFxRate(from, tc);
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
    // Custom slots are not shown in the sidebar — they're calendar-only entries
    let list = regularAttractions;
    if (filter === "scheduled")   list = scheduled;
    if (filter === "unscheduled") list = unscheduled;
    const q = search.trim().toLowerCase();
    return q ? list.filter((a) => a.name.toLowerCase().includes(q)) : list;
  }, [regularAttractions, scheduled, unscheduled, filter, search]);

  // Group multiple scheduled instances of the same attraction under one sidebar card —
  // each instance stays individually reassignable/unassignable, but the "+ Schedule
  // again" control and the card header are shared, instead of rendering N near-identical
  // cards for the same attraction.
  const sidebarGroups = useMemo(() => {
    const order: string[] = [];
    const groups = new Map<string, Attraction[]>();
    for (const a of sidebarList) {
      const key = a.attractionId ?? a._id;
      if (!groups.has(key)) { groups.set(key, []); order.push(key); }
      groups.get(key)!.push(a);
    }
    return order.map((key) => ({ key, instances: groups.get(key)! }));
  }, [sidebarList]);

  const alerts: ScheduleAlert[] = useMemo(
    () => (canEdit ? computeAlerts(local, dayStart, dayEnd) : []),
    [local, dayStart, dayEnd, canEdit]
  );
  const visibleAlerts = alerts.filter((a) => !dismissedAlerts.has(a.id));

  // ── API ───────────────────────────────────────────────────────────────────

  async function putOne(id: string, patch: Partial<Attraction>) {
    // Schedule fields (plannedDate, plannedTime, actualDuration) live in Trip.schedules,
    // so we PATCH the trip-scoped schedule endpoint rather than the global attraction.
    const res = await updateTripAttractionSchedule(trip._id, id, token, patch);
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

  // Unassigning a 2nd+ instance (synthetic "at-" key) removes it outright instead of
  // demoting it to an "Unscheduled" row — an unscheduled duplicate serves no purpose
  // (the attraction is already represented by its other instance/s; "+ Schedule again"
  // recreates one on demand). Only the primary instance's unassign keeps the old
  // behavior of moving the card into the Unscheduled list.
  async function handleUnassign(id: string) {
    if (id.startsWith("at-")) {
      if (!token) return;
      try {
        await removeAttractionFromTrip(trip._id, id, token);
        applyLocal(local.filter((a) => a._id !== id));
        setPending((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
      } catch {
        toast.error("Couldn't remove that scheduled instance. Please try again.");
      }
      return;
    }
    const patch = { plannedDate: null, plannedTime: null };
    applyLocal(local.map((a) => a._id === id ? { ...a, ...patch } : a));
    addPending(id, patch);
  }

  // Schedules an additional, independent instance of an already-scheduled attraction —
  // the "Move to day…" select on a scheduled card reassigns that SAME instance, so
  // scheduling the same attraction again (e.g. the same restaurant twice) needs its own
  // entry point. Unlike the old version, this schedules the new instance directly onto
  // the chosen day (same earliest-free-slot logic as handleAssign) instead of dropping an
  // unscheduled duplicate into a different list for the user to hunt down and assign.
  async function handleDuplicateAttraction(a: Attraction, dayIso: string) {
    if (!token || !dayIso) return;

    const rawVal = parseFloat(a.actualDurationValue ?? a.durationValue ?? "");
    const unit = a.actualDurationUnit ?? a.durationUnit ?? "hours";
    const durationMins = isNaN(rawVal) || rawVal <= 0 ? 60 : unit === "hours" ? rawVal * 60 : rawVal;
    const timedOnDay = local.filter((x) => x.plannedDate === dayIso && !!x.plannedTime);
    const plannedTime = findEarliestFreeSlot(timedOnDay, durationMins);

    try {
      const created = (await addAttractionToTrip(trip._id, token, {
        existingAttractionId: a.attractionId ?? a._id,
        allowDuplicate: true,
        plannedDate: dayIso,
        plannedTime,
      })) as Attraction;
      applyLocal([created, ...local]);
      toast.success(`Scheduled another "${a.name}" for ${formatDayLabel(dayIso)}`);
    } catch {
      toast.error("Couldn't schedule it again. Please try again.");
    }
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

  async function handleCustomSlotSave(data: CustomSlotFormData) {
    if (!token) return;
    try {
      const created = (await addAttractionToTrip(trip._id, token, {
        name:                data.name,
        subtype:             "custom-slot",
        types:               data.types,
        price:               data.price,
        currency:            data.currency,
        notes:               data.notes,
        plannedDate:         data.plannedDate,
        plannedTime:         data.plannedTime,
        actualDurationValue: data.actualDurationValue,
        actualDurationUnit:  data.actualDurationUnit,
      })) as Attraction;
      applyLocal([created, ...local]);
      toast.success("Slot added");
    } catch {
      toast.error("Couldn't save the slot. Please try again.");
    }
  }

  async function handleCustomSlotUpdate(data: CustomSlotFormData) {
    if (!token || !editingCustomSlot) return;
    const id = editingCustomSlot._id;
    setEditingCustomSlot(null);
    try {
      const res = await updateTripAttractionSchedule(trip._id, id, token, {
        name:                data.name,
        typeNames:           data.types,
        price:               data.price,
        currency:            data.currency,
        notes:               data.notes,
        plannedDate:         data.plannedDate,
        plannedTime:         data.plannedTime,
        actualDurationValue: data.actualDurationValue,
        actualDurationUnit:  data.actualDurationUnit,
      });
      if (res.ok) {
        const updated = (await res.json()) as Attraction;
        applyLocal(local.map((a) => a._id !== updated._id ? a : updated));
        toast.success("Slot updated");
      } else {
        toast.error("Couldn't update the slot. Please try again.");
      }
    } catch {
      toast.error("Couldn't update the slot. Please try again.");
    }
  }

  async function handleDeleteCustomSlot(id: string) {
    if (!token) return;
    try {
      await removeAttractionFromTrip(trip._id, id, token);
      applyLocal(local.filter((a) => a._id !== id));
      toast.success("Slot deleted");
    } catch {
      toast.error("Couldn't delete the slot. Please try again.");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const hasPending = pending.size > 0;

  function saveCalRange(start: number, end: number) {
    if (!token) return;
    updateTrip(trip._id, token, { calDayStart: start, calDayEnd: end })
      .catch(() => toast.error("Couldn't save the day range. Please try again."));
  }

  function handleDayStartChange(h: number) {
    setDayStart(h);
    saveCalRange(h, dayEnd);
  }

  function handleDayEndChange(h: number) {
    setDayEnd(h);
    saveCalRange(dayStart, h);
  }

  const headerProps = {
    totalSpend, trip, canEdit,
    hasPending, saving, savedOk,
    dayStart, dayEnd,
    showMap,
    onSave: handleSaveAll,
    onDayStartChange: handleDayStartChange,
    onDayEndChange: handleDayEndChange,
    onToggleMap: () => setShowMap((v) => !v),
    onAddCustomSlot: () => setCustomSlotModalOpen(true),
  };

  // Shared modal — must be rendered in BOTH branches so the modal works even
  // when there are no regular attractions yet (early-return branch).
  const customSlotModal = (
    <AddCustomSlotModal
      isOpen={customSlotModalOpen || !!editingCustomSlot}
      onClose={() => { setCustomSlotModalOpen(false); setEditingCustomSlot(null); }}
      onSave={editingCustomSlot ? handleCustomSlotUpdate : handleCustomSlotSave}
      tripStartDate={trip.startDate}
      tripEndDate={trip.endDate}
      currency={trip.currency ?? "USD"}
      initialData={editingCustomSlot ? {
        name:                editingCustomSlot.name,
        plannedDate:         editingCustomSlot.plannedDate  ?? "",
        plannedTime:         editingCustomSlot.plannedTime  ?? "",
        actualDurationValue: editingCustomSlot.actualDurationValue ?? editingCustomSlot.durationValue ?? "",
        actualDurationUnit:  editingCustomSlot.actualDurationUnit  ?? editingCustomSlot.durationUnit  ?? "hours",
        types:               editingCustomSlot.types,
        price:               editingCustomSlot.price  ?? null,
        currency:            editingCustomSlot.currency ?? trip.currency ?? "USD",
        notes:               editingCustomSlot.notes   ?? "",
      } : undefined}
    />
  );

  if (attractions.length === 0) {
    return (
      <>
        <div className={styles.card}>
          <Header {...headerProps} hasPending={false} saving={false} savedOk={false} onSave={() => {}} />
          <div className={styles.emptyState}>
            <Calendar size={36} className={styles.emptyIcon} aria-hidden="true" />
            <p className={styles.emptyText}>
              {canEdit ? "Add attractions to start planning your itinerary." : "No itinerary scheduled yet."}
            </p>
          </div>
        </div>
        {customSlotModal}
      </>
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
              {sidebarGroups.length === 0 ? (
                <p className={styles.panelEmpty}>No attractions match.</p>
              ) : sidebarGroups.map(({ key, instances }) => {
                const first = instances[0];
                const icon = renderTypeIcon(findType(first.types?.[0] ?? "")?.icon ?? "");
                const color = colorForType(first.types?.[0] ?? "");
                const anyScheduled = instances.some((i) => !!i.plannedDate);
                const canDuplicate = instances.length > 0 && instances.every((i) => !!i.attractionId);

                // Single instance (the common case): unchanged markup/behavior from before
                // this feature existed.
                if (instances.length === 1) {
                  const a = first;
                  const isScheduled = !!a.plannedDate;
                  return (
                    <div key={key}
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
                      {canEdit && isScheduled && a.attractionId && (
                        <select className={styles.duplicateSelect}
                          value=""
                          aria-label={`Schedule ${a.name} again on another day`}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) handleDuplicateAttraction(a, val);
                          }}
                        >
                          <option value="">+ Schedule again…</option>
                          {days.map((day) => (
                            <option key={day} value={day}>{formatDayLabel(day)}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                }

                // Multiple instances of the same attraction: one card, one row per
                // instance — each independently reassignable/unassignable — plus a
                // single shared "+ Schedule again" control to add yet another.
                return (
                  <div key={key}
                    className={`${styles.sidebarCard} ${anyScheduled ? styles.sidebarCardScheduled : ""}`}
                    style={{ ["--type-color" as string]: color }}
                  >
                    <div className={styles.cardTopRow}>
                      <div className={styles.typeIconCircle} aria-hidden="true">{icon}</div>
                      <span className={styles.cardName}>{first.name}</span>
                    </div>
                    {first.durationValue && (
                      <span className={styles.recDuration}>Rec: {first.durationValue} {first.durationUnit}</span>
                    )}
                    <div className={styles.instancesList}>
                      {instances.map((a) => {
                        const isScheduled = !!a.plannedDate;
                        return (
                          <div key={a._id} className={styles.instanceRow}>
                            {isScheduled && a.plannedDate ? (
                              <span className={styles.dayBadge}>
                                {formatDayLabel(a.plannedDate)}{a.plannedTime ? ` · ${a.plannedTime}` : ""}
                              </span>
                            ) : (
                              <span className={styles.dayBadgeMuted}>Unscheduled</span>
                            )}
                            {canEdit && (
                              <select className={styles.assignSelect}
                                value={a.plannedDate ?? ""}
                                aria-label={`${isScheduled ? "Reassign" : "Assign"} this instance of ${a.name}`}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "__unassign__") handleUnassign(a._id);
                                  else handleAssign(a._id, val);
                                }}
                              >
                                <option value="" disabled={isScheduled}>
                                  {isScheduled ? "Move to day…" : "Assign to day…"}
                                </option>
                                {isScheduled && (
                                  <option value="__unassign__">
                                    {a._id.startsWith("at-") ? "— Remove" : "— Unassign"}
                                  </option>
                                )}
                                {days.map((day) => (
                                  <option key={day} value={day}>{formatDayLabel(day)}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {canEdit && canDuplicate && (
                      <select className={styles.duplicateSelect}
                        value=""
                        aria-label={`Schedule ${first.name} again on another day`}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) handleDuplicateAttraction(first, val);
                        }}
                      >
                        <option value="">+ Schedule again…</option>
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
          <div
            className={styles.dayColumnsWrapper}
            role="region"
            aria-label="Itinerary calendar"
            onPointerDown={(e) => {
              pointerStartX.current = e.clientX;
              pointerStartY.current = e.clientY;
            }}
            onPointerUp={(e) => {
              if (pointerStartX.current === null || pointerStartY.current === null) return;
              const dx = e.clientX - pointerStartX.current;
              const dy = e.clientY - pointerStartY.current;
              pointerStartX.current = null;
              pointerStartY.current = null;
              if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx)) return;
              if (dx < 0) setMobileDayIdx((i) => Math.min(i + 1, daysCountRef.current - 1));
              else        setMobileDayIdx((i) => Math.max(i - 1, 0));
            }}
            onPointerLeave={() => {
              pointerStartX.current = null;
              pointerStartY.current = null;
            }}
          >
            {days.length > 1 && (
              <div className={styles.mobileDayIndicator} aria-hidden="true">
                {days.map((_, i) => (
                  <span key={i} className={i === mobileDayIdx ? styles.mobileDotActive : styles.mobileDot} />
                ))}
              </div>
            )}
            <div className={styles.dayColumns}
              style={{ ["--mobile-day-idx" as string]: mobileDayIdx }}>
              {days.map((dayIso, dayIndex) => {
                const dayAttractions = local.filter((a) => a.plannedDate === dayIso);
                const untimed = dayAttractions.filter((a) => !a.plannedTime);
                const dayMins = calcDaySpanMinutes(dayAttractions.filter((a) => !!a.plannedTime));
                const isOverloaded = dayMins > 480;
                const dayLabel = formatDayLabel(dayIso);

                // Cards whose duration crosses midnight (e.g. an overnight flight or custom
                // time-slot) also get a "continuation" block on the following day, running
                // from 00:00 for however many minutes spill past midnight. The continuation
                // is a display-only clone for positioning — click handling always resolves
                // back to the real (previous-day) attraction via spilloverOriginalsById.
                const prevDayIso = dayIndex > 0 ? days[dayIndex - 1] : null;
                const spillovers = prevDayIso
                  ? local.filter((a) => a.plannedDate === prevDayIso && !!a.plannedTime && attractionEndMins(a) > 1440)
                  : [];
                const spilloverOriginalsById = new Map(spillovers.map((a) => [a._id, a]));
                const continuationItems = spillovers.map((a) => ({
                  ...a,
                  plannedTime: "00:00",
                  actualDurationValue: String(attractionEndMins(a) - 1440),
                  actualDurationUnit: "minutes" as const,
                }));

                // Overlap-aware layout
                const layout     = layoutTimed([...dayAttractions, ...continuationItems]);
                const maxOverlap = layout.length > 0 ? Math.max(...layout.map((l) => l.numCols)) : 1;
                const colWidth   = dayColumnWidth(maxOverlap);
                const LABEL_W    = 46;
                const PAD_R      = 4;
                const availW     = colWidth - LABEL_W - PAD_R;

                return (
                  <div key={dayIso}
                    className={styles.dayColumn}
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
                        const top        = slotTop(a.plannedTime, dayStart);
                        const height     = cardPx(a);
                        const isCustomSlot = a.subtype === "custom-slot";
                        const color        = isCustomSlot ? "var(--color-accent)" : colorForType(a.types?.[0] ?? "");
                        const rawIcon      = renderTypeIcon(findType(a.types?.[0] ?? "")?.icon ?? "");
                        const icon         = (!rawIcon && isCustomSlot) ? <Coffee size={10} /> : rawIcon;
                        const isPending = pending.has(a._id);
                        const blockW    = availW / numCols;
                        const blockL    = LABEL_W + col * blockW;
                        const isCompact = height < SLOT_HEIGHT_PX;

                        // Detect flight by subtype OR by type tag (handles entries created before subtype was added)
                        const isFlight = a.subtype === "flight" || a.types?.[0] === "Flight";
                        const blockLabel = isFlight && a.departureAirport && a.arrivalAirport
                          ? `${a.departureAirport} → ${a.arrivalAirport}`
                          : a.name;

                        // This block is the portion of a previous-day card spilling past
                        // midnight into today — `a` is a display-only clone (plannedTime
                        // reset to 00:00 for positioning), so clicks resolve back to the
                        // real attraction (its true plannedDate/plannedTime) via this map.
                        const isContinuation = a.plannedDate !== dayIso;
                        const clickTarget = isContinuation ? (spilloverOriginalsById.get(a._id) ?? a) : a;

                        function handleBlockClick(e: React.MouseEvent) {
                          if (isCustomSlot) {
                            if (canEdit && !isContinuation) setEditingCustomSlot(clickTarget);
                            else setViewingAttraction(clickTarget);
                            return;
                          }
                          // Flights have their own dedicated editor (real depart/arrival
                          // times, not a single plannedTime) — view-only here. Residences
                          // are otherwise a regular schedule entry and get the same
                          // click-to-edit-time popup as any other attraction.
                          if (isFlight) { setViewingAttraction(clickTarget); return; }
                          if (canEdit && !isContinuation) openPopup(e, clickTarget);
                          else setViewingAttraction(clickTarget);
                        }

                        const continuationEndMins = isContinuation ? attractionEndMins(clickTarget) - 1440 : null;
                        const continuationEndLabel = continuationEndMins != null
                          ? `${String(Math.floor(continuationEndMins / 60)).padStart(2, "0")}:${String(continuationEndMins % 60).padStart(2, "0")}`
                          : null;

                        return (
                          <div
                            key={a._id}
                            className={`${styles.attractionBlock} ${isPending ? styles.blockPending : ""} ${isCompact ? styles.blockCompact : ""} ${isCustomSlot ? styles.blockFreeSlot : ""} ${isContinuation ? styles.blockContinuation : ""}`}
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
                            aria-label={`${a.name}${isContinuation ? ` — continued from ${formatDayLabel(prevDayIso!)}, until ${continuationEndLabel}` : ` at ${a.plannedTime}`}${
                              isContinuation ? " — click to view details" :
                              isCustomSlot && canEdit ? " — click to edit" :
                              !isFlight && canEdit ? " — click to edit time" :
                              " — click to view details"
                            }`}
                          >
                            <div className={styles.blockTopRow}>
                              {icon && <span className={styles.blockIcon} aria-hidden="true">{icon}</span>}
                              <span className={styles.blockTime}>
                                {isContinuation ? `↷ until ${continuationEndLabel}` : a.plannedTime}
                              </span>
                            </div>
                            <span className={styles.blockName}>{blockLabel}</span>
                            {canEdit && !isContinuation && (
                              <button type="button" className={styles.unassignBtnBlock}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isCustomSlot) handleDeleteCustomSlot(a._id);
                                  else handleUnassign(a._id);
                                }}
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

                    {dayAttractions.length === 0 && continuationItems.length === 0 && (
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

      {customSlotModal}
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
  onAddCustomSlot: () => void;
}

function Header({
  totalSpend, trip, canEdit,
  hasPending, saving, savedOk,
  dayStart, dayEnd,
  showMap,
  onSave, onDayStartChange, onDayEndChange, onToggleMap, onAddCustomSlot,
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
        {canEdit && (
          <button type="button" className={styles.addFreeSlotBtn} onClick={onAddCustomSlot}>
            <Plus size={13} aria-hidden="true" />
            Custom time-slot
          </button>
        )}

        {trip.budget ? (
          <div className={`${styles.budgetWidget} ${totalSpend > trip.budget ? styles.budgetWidgetOver : ""}`}>
            <div className={styles.budgetWidgetRow}>
              <span className={styles.budgetSpent}>{formatPrice(totalSpend, trip.currency ?? "USD")}</span>
              <span className={styles.budgetOf}>of {formatPrice(trip.budget, trip.currency ?? "USD")}</span>
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
