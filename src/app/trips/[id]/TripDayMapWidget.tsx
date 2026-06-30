"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { TriangleAlert, MapPinOff, Footprints, Car, Bus } from "lucide-react";
import { ICONS } from "@/components/NewAttractionModal/AttractionTypeChip";
import type { AttractionType } from "@/components/NewAttractionModal/attraction.types";
import { MIN_OVERLAP_DURATION_MINS } from "@/config/ui";
import { TYPE_CATEGORIES, CATEGORY_COLORS } from "@/components/NewAttractionModal/attraction.constants";
import type { Trip } from "@/types/trip";
import type { Attraction } from "@/types/attraction";
import styles from "./TripDayMapWidget.module.css";
import "leaflet/dist/leaflet.css";

// Fix default marker icons broken by webpack asset fingerprinting in Next.js
/* eslint-disable @typescript-eslint/no-explicit-any */
delete (L.Icon.Default.prototype as any)._getIconUrl;
/* eslint-enable @typescript-eslint/no-explicit-any */
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function categoryColor(types: string[]): string {
  const type = types?.[0];
  if (!type) return "#64748B";
  for (const [cat, catTypes] of Object.entries(TYPE_CATEGORIES)) {
    if ((catTypes as string[]).includes(type)) {
      return CATEGORY_COLORS[cat] ?? "#64748B";
    }
  }
  return "#64748B";
}

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

function timeToMins(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function attractionEndMins(a: Attraction): number {
  const start = timeToMins(a.plannedTime!);
  const val = parseFloat(a.actualDurationValue ?? a.durationValue ?? "0");
  const unit = a.actualDurationUnit ?? a.durationUnit ?? "hours";
  const dur = unit === "hours" ? val * 60 : val;
  return start + Math.max(dur, MIN_OVERLAP_DURATION_MINS);
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

type TravelMode = "walk" | "car" | "transit";

const TRAVEL_SPEEDS: Record<TravelMode, number> = { walk: 4, car: 40, transit: 20 };
const TRAVEL_LABELS: Record<TravelMode, string>  = { walk: "walk", car: "drive", transit: "transit" };

function transitTime(km: number, mode: TravelMode): string {
  const mins = Math.round((km / TRAVEL_SPEEDS[mode]) * 60);
  return mins < 1
    ? `< 1 min ${TRAVEL_LABELS[mode]}`
    : `~${mins} min ${TRAVEL_LABELS[mode]}`;
}

function legKey(fromId: string, toId: string): string {
  return `${fromId}_${toId}`;
}

// ── DivIcon marker ────────────────────────────────────────────────────────────

function makeMarkerIcon(types: string[], order: number, isAlt: boolean): L.DivIcon {
  const color = isAlt ? "#94A3B8" : categoryColor(types);
  const icon = ICONS[types[0] as AttractionType];
  let iconSvg = "";
  if (icon) {
    try {
      iconSvg = renderToStaticMarkup(icon as React.ReactElement)
        .replace(/currentColor/g, "#ffffff");
    } catch {
      // silently fall back to no icon
    }
  }

  const badge =
    order > 0
      ? `<span style="position:absolute;top:-5px;right:-5px;width:16px;height:16px;border-radius:50%;background:#0F172A;color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;border:1.5px solid #fff;line-height:1">${order}</span>`
      : "";

  return L.divIcon({
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;position:relative">${iconSvg}${badge}</div>`,
    iconSize: [28, 28] as [number, number],
    iconAnchor: [14, 14] as [number, number],
    className: "",
  });
}

// ── Conflict detection ────────────────────────────────────────────────────────

interface ConflictGroup {
  key: string;
  attractions: Attraction[];
}

function detectConflicts(sorted: Attraction[]): ConflictGroup[] {
  const groups: ConflictGroup[] = [];
  let i = 0;
  while (i < sorted.length) {
    const group: Attraction[] = [sorted[i]];
    let groupEnd = attractionEndMins(sorted[i]);
    let j = i + 1;
    while (j < sorted.length) {
      const jStart = timeToMins(sorted[j].plannedTime!);
      if (jStart < groupEnd) {
        group.push(sorted[j]);
        groupEnd = Math.max(groupEnd, attractionEndMins(sorted[j]));
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

function findRouteNeighbour(alt: Attraction, route: Attraction[]): Attraction | null {
  if (route.length === 0) return null;
  const altTime = timeToMins(alt.plannedTime!);
  return route.reduce((nearest, r) =>
    Math.abs(timeToMins(r.plannedTime!) - altTime) <
    Math.abs(timeToMins(nearest.plannedTime!) - altTime)
      ? r : nearest
  );
}

// ── Transit label (Leaflet marker placed at segment midpoint) ─────────────────

interface TransitLabelProps {
  from: { lat: number; lng: number };
  to:   { lat: number; lng: number };
  label: string;
}

function TransitLabel({ from, to, label }: TransitLabelProps) {
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;
  const icon = L.divIcon({
    html: `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:2px 8px;font-size:11px;font-weight:600;color:#475569;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.1);pointer-events:none">${label}</div>`,
    iconSize: undefined as unknown as [number, number],
    iconAnchor: undefined as unknown as [number, number],
    className: "",
  });
  return <Marker position={[midLat, midLng]} icon={icon} interactive={false} />;
}

// ── Main component ────────────────────────────────────────────────────────────

interface TripDayMapWidgetProps {
  trip: Trip;
  attractions: Attraction[];
}

export function TripDayMapWidget({ trip, attractions }: TripDayMapWidgetProps) {
  const [selectedDay, setSelectedDay]               = useState<string>("");
  const [conflictSelections, setConflictSelections] = useState<Record<string, string>>({});
  const [legModes, setLegModes]                     = useState<Record<string, TravelMode>>({});

  const allDays = useMemo(
    () => getTripDays(trip.startDate, trip.endDate),
    [trip.startDate, trip.endDate]
  );

  const qualifyingDays = useMemo(
    () => allDays.filter((d) =>
      attractions.some((a) => a.plannedDate === d && !!a.coordinates && !!a.plannedTime)
    ),
    [allDays, attractions]
  );

  // Default to first qualifying day on mount or when list changes
  useEffect(() => {
    if (qualifyingDays.length === 0) return;
    if (!selectedDay || !qualifyingDays.includes(selectedDay)) {
      setSelectedDay(qualifyingDays[0]);
    }
  }, [qualifyingDays, selectedDay]);

  const dayAttractions = useMemo(
    () =>
      attractions
        .filter((a) => a.plannedDate === selectedDay && !!a.plannedTime)
        .sort((a, b) => timeToMins(a.plannedTime!) - timeToMins(b.plannedTime!)),
    [attractions, selectedDay]
  );

  const mapped   = useMemo(() => dayAttractions.filter((a) => !!a.coordinates), [dayAttractions]);
  const unmapped = useMemo(() => dayAttractions.filter((a) => !a.coordinates),  [dayAttractions]);

  const conflictGroups = useMemo(() => detectConflicts(mapped), [mapped]);

  // Merge user selections with defaults (first attraction wins per group)
  const effectiveSelections = useMemo(() => {
    const merged: Record<string, string> = {};
    for (const group of conflictGroups) {
      merged[group.key] = conflictSelections[group.key] ?? group.attractions[0]._id;
    }
    return merged;
  }, [conflictGroups, conflictSelections]);

  const altIds = useMemo(() => {
    const set = new Set<string>();
    for (const group of conflictGroups) {
      const selectedId = effectiveSelections[group.key];
      for (const a of group.attractions) {
        if (a._id !== selectedId) set.add(a._id);
      }
    }
    return set;
  }, [conflictGroups, effectiveSelections]);

  const routeAttractions = useMemo(
    () => mapped.filter((a) => !altIds.has(a._id)),
    [mapped, altIds]
  );
  const altAttractions = useMemo(
    () => mapped.filter((a) => altIds.has(a._id)),
    [mapped, altIds]
  );

  const bounds = useMemo(() => {
    if (mapped.length === 0) return L.latLngBounds([[0, 0], [0, 0]]);
    if (mapped.length === 1) {
      const { lat, lng } = mapped[0].coordinates!;
      return L.latLngBounds([[lat - 0.01, lng - 0.01], [lat + 0.01, lng + 0.01]]);
    }
    return L.latLngBounds(
      mapped.map((a) => [a.coordinates!.lat, a.coordinates!.lng] as [number, number])
    );
  }, [mapped]);

  if (qualifyingDays.length === 0) {
    return (
      <div className={styles.emptyMap}>
        <MapPinOff size={28} aria-hidden="true" />
        <p>No attractions with locations have been scheduled yet.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Day selector */}
      <div className={styles.mapDayTabs} role="tablist" aria-label="Select day to view on map">
        {qualifyingDays.map((d) => (
          <button
            key={d}
            role="tab"
            aria-selected={d === selectedDay}
            className={`${styles.mapDayTab} ${d === selectedDay ? styles.mapDayTabActive : ""}`}
            onClick={() => setSelectedDay(d)}
          >
            {formatDayLabel(d)}
          </button>
        ))}
      </div>

      {/* Conflict banner */}
      {conflictGroups.length > 0 && (
        <div className={styles.conflictBanner} role="alert">
          <TriangleAlert size={14} className={styles.conflictIcon} aria-hidden="true" />
          <div className={styles.conflictBody}>
            <span className={styles.conflictLabel}>
              Scheduling conflict — choose which to route:
            </span>
            {conflictGroups.map((group) => (
              <div key={group.key} className={styles.conflictChips}>
                {group.attractions.map((a) => {
                  const isActive = effectiveSelections[group.key] === a._id;
                  const color = categoryColor(a.types);
                  return (
                    <button
                      key={a._id}
                      type="button"
                      className={`${styles.conflictChip} ${isActive ? styles.conflictChipActive : ""}`}
                      style={isActive ? { ["--chip-color" as string]: color } : undefined}
                      onClick={() =>
                        setConflictSelections((p) => ({ ...p, [group.key]: a._id }))
                      }
                      aria-pressed={isActive}
                    >
                      {a.name}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map */}
      <div className={styles.mapContainer}>
        {selectedDay && mapped.length > 0 && (
          <MapContainer
            key={selectedDay}
            bounds={bounds}
            boundsOptions={{ padding: [40, 40] }}
            style={{ height: "100%", width: "100%" }}
            zoomControl
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {/* Markers */}
            {mapped.map((a) => {
              const routeIdx = routeAttractions.indexOf(a);
              const isAlt = altIds.has(a._id);
              const order = isAlt ? 0 : routeIdx + 1;
              return (
                <Marker
                  key={a._id}
                  position={[a.coordinates!.lat, a.coordinates!.lng]}
                  icon={makeMarkerIcon(a.types, order, isAlt)}
                >
                  <Tooltip direction="top" offset={[0, -14]}>
                    <strong>{a.name}</strong>
                    {a.plannedTime ? ` · ${a.plannedTime}` : ""}
                  </Tooltip>
                </Marker>
              );
            })}

            {/* Main route polylines with transit labels */}
            {routeAttractions.slice(0, -1).map((a, i) => {
              const next = routeAttractions[i + 1];
              if (!a.coordinates || !next.coordinates) return null;
              const from: [number, number] = [a.coordinates.lat, a.coordinates.lng];
              const to:   [number, number] = [next.coordinates.lat, next.coordinates.lng];
              const km = haversineKm(a.coordinates, next.coordinates);
              return (
                <React.Fragment key={`leg-${a._id}`}>
                  <Polyline
                    positions={[from, to]}
                    pathOptions={{ color: "#0EA5E9", weight: 3, opacity: 0.85 }}
                  />
                  <TransitLabel
                    from={a.coordinates}
                    to={next.coordinates}
                    label={transitTime(km, legModes[legKey(a._id, next._id)] ?? "walk")}
                  />
                </React.Fragment>
              );
            })}

            {/* Conflict alternate polylines — dashed */}
            {altAttractions.map((a) => {
              if (!a.coordinates) return null;
              const neighbour = findRouteNeighbour(a, routeAttractions);
              if (!neighbour?.coordinates) return null;
              return (
                <Polyline
                  key={`alt-${a._id}`}
                  positions={[
                    [a.coordinates.lat, a.coordinates.lng],
                    [neighbour.coordinates.lat, neighbour.coordinates.lng],
                  ]}
                  pathOptions={{ color: "#94A3B8", weight: 2, opacity: 0.55, dashArray: "6 4" }}
                />
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* Route legs panel */}
      {routeAttractions.length >= 2 && (
        <div className={styles.legPanel}>
          {routeAttractions.slice(0, -1).map((a, i) => {
            const next = routeAttractions[i + 1];
            if (!a.coordinates || !next.coordinates) return null;
            const key  = legKey(a._id, next._id);
            const mode = legModes[key] ?? "walk";
            const km   = haversineKm(a.coordinates, next.coordinates);
            return (
              <div key={key} className={styles.legRow}>
                <span className={styles.legName}>
                  {a.name} → {next.name}
                </span>
                <div
                  className={styles.modeGroup}
                  role="group"
                  aria-label={`Travel mode from ${a.name} to ${next.name}`}
                >
                  <button
                    type="button"
                    className={`${styles.modeBtn} ${mode === "walk" ? styles.modeBtnActive : ""}`}
                    onClick={() => setLegModes((p) => ({ ...p, [key]: "walk" }))}
                    aria-pressed={mode === "walk"}
                    aria-label="Walk"
                  >
                    <Footprints size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={`${styles.modeBtn} ${mode === "car" ? styles.modeBtnActive : ""}`}
                    onClick={() => setLegModes((p) => ({ ...p, [key]: "car" }))}
                    aria-pressed={mode === "car"}
                    aria-label="Drive"
                  >
                    <Car size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={`${styles.modeBtn} ${mode === "transit" ? styles.modeBtnActive : ""}`}
                    onClick={() => setLegModes((p) => ({ ...p, [key]: "transit" }))}
                    aria-pressed={mode === "transit"}
                    aria-label="Public transport"
                  >
                    <Bus size={14} aria-hidden="true" />
                  </button>
                </div>
                <span className={styles.legTime}>{transitTime(km, mode)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Unmapped attractions */}
      {unmapped.length > 0 && (
        <div className={styles.unmappedList}>
          <MapPinOff size={13} className={styles.unmappedIcon} aria-hidden="true" />
          <span>No location — excluded from route:</span>
          {unmapped.map((a) => (
            <span key={a._id} className={styles.unmappedChip}>{a.name}</span>
          ))}
        </div>
      )}
    </div>
  );
}
