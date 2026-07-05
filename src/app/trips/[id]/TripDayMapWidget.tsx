"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { TriangleAlert, MapPinOff, Footprints, Car, Bus, BedDouble, Loader2, Plane } from "lucide-react";
import { renderTypeIcon } from "@/lib/attractionIcons";
import { useAttractionTypes } from "@/hooks/useAttractionTypes";
import { MIN_OVERLAP_DURATION_MINS } from "@/config/ui";
import type { Trip } from "@/types/trip";
import type { Attraction } from "@/types/attraction";
import {
  fetchRouteLeg, fetchAirportLeg, formatLegDuration, formatStepDuration,
  type TravelMode, type RouteLeg,
} from "./routeService";
import { lookupAirport, getAirportCarCoord } from "./airportData";
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


function legKey(fromId: string, toId: string, mode: TravelMode): string {
  return `${mode}__${fromId}__${toId}`;
}

// ── DivIcon marker ────────────────────────────────────────────────────────────

function makeMarkerIcon(
  types: string[], order: number, isAlt: boolean,
  colorFn: (t: string) => string, iconName: string,
): L.DivIcon {
  const color = isAlt ? "#94A3B8" : colorFn(types[0] ?? "");
  const icon = iconName ? renderTypeIcon(iconName) : null;
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

function makeAirportMarkerIcon(label: string): L.DivIcon {
  let iconSvg = "";
  try { iconSvg = renderToStaticMarkup(<Plane size={12} color="#ffffff" aria-hidden="true" />); } catch { /* */ }
  return L.divIcon({
    html: `<div style="width:34px;height:34px;border-radius:8px;background:#0F172A;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px">${iconSvg}<span style="font-size:7px;font-weight:800;color:#fff;line-height:1;letter-spacing:0.5px">${label}</span></div>`,
    iconSize:   [34, 34] as [number, number],
    iconAnchor: [17, 17] as [number, number],
    className: "",
  });
}

function makeResidenceMarkerIcon(): L.DivIcon {
  let iconSvg = "";
  try {
    iconSvg = renderToStaticMarkup(<BedDouble size={13} color="#ffffff" aria-hidden="true" />);
  } catch { /* fallback to no icon */ }
  return L.divIcon({
    html: `<div style="width:32px;height:32px;border-radius:50%;background:#D97706;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(217,119,6,0.4);display:flex;align-items:center;justify-content:center;position:relative">${iconSvg}</div>`,
    iconSize:   [32, 32] as [number, number],
    iconAnchor: [16, 16] as [number, number],
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
  const { colorForType, findType } = useAttractionTypes();
  const [selectedDay, setSelectedDay]               = useState<string>("");
  const [conflictSelections, setConflictSelections] = useState<Record<string, string>>({});
  const [legModes, setLegModes]                     = useState<Record<string, TravelMode>>({});

  // Route cache in state so React can read it during render.
  // loadingKeys stays a ref for synchronous duplicate-fetch prevention in the effect.
  const [routeCache, setRouteCache] = useState<Record<string, RouteLeg | null>>({});
  const loadingKeysRef = useRef<Set<string>>(new Set());

  const allDays = useMemo(
    () => getTripDays(trip.startDate, trip.endDate),
    [trip.startDate, trip.endDate]
  );

  // Residences with coordinates, for quick lookup
  const residencesWithCoords = useMemo(
    () => attractions.filter(
      (a) => a.subtype === "residence" && !!a.coordinates && !!a.checkInDate && !!a.checkOutDate
    ),
    [attractions]
  );

  function residencesOnDay(dayIso: string): Attraction[] {
    return residencesWithCoords.filter(
      (r) => r.checkInDate! <= dayIso && dayIso <= r.checkOutDate!
    );
  }

  const qualifyingDays = useMemo(
    () => allDays.filter((d) =>
      attractions.some((a) => a.plannedDate === d && !!a.coordinates && !!a.plannedTime) ||
      residencesWithCoords.some((r) => r.checkInDate! <= d && d <= r.checkOutDate!) ||
      // Days with flights that have known airports (any country) qualify for map view
      attractions.some((a) => {
        if (a.subtype !== "flight" && a.types?.[0] !== "Flight") return false;
        const depDate = a.departureTime?.split("T")[0] ?? a.plannedDate;
        const arrDate = a.arrivalTime?.split("T")[0];
        const hasDepAirport = !!(a.departureAirport && lookupAirport(a.departureAirport));
        const hasArrAirport = !!(a.arrivalAirport  && lookupAirport(a.arrivalAirport));
        return (depDate === d && hasDepAirport) || (arrDate === d && hasArrAirport);
      })
    ),
    [allDays, attractions, residencesWithCoords]
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

  const dayResidences = useMemo(
    () => selectedDay ? residencesOnDay(selectedDay) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedDay, residencesWithCoords]
  );

  // Airports for flights on the selected day — split into:
  //  • route waypoints (same country as trip): inserted into fullRoute as start/end points
  //  • standalone markers (different country): shown as info pins only
  const { arrivalWaypoints, departureWaypoints, standaloneAirports } = useMemo(() => {
    const tripCountry = trip.country;
    const arrivals:    Attraction[] = [];
    const departures:  Attraction[] = [];
    const standalone:  { iata: string; lat: number; lng: number }[] = [];
    const seen = new Set<string>();

    for (const a of attractions) {
      if (a.subtype !== "flight" && a.types?.[0] !== "Flight") continue;

      // Departure airport — user leaves from here
      const depDate = a.departureTime?.split("T")[0] ?? a.plannedDate;
      if (depDate === selectedDay && a.departureAirport && !seen.has(`dep_${a.departureAirport}`)) {
        seen.add(`dep_${a.departureAirport}`);
        const info = lookupAirport(a.departureAirport);
        if (info) {
          if (info.country === tripCountry) {
            departures.push({
              _id: `__airport_dep_${a.departureAirport}`,
              tripId: "", ownerId: "", name: `${a.departureAirport} – ${info.city}`,
              country: info.country, city: info.city,
              coordinates: { lat: info.lat, lng: info.lng },
              types: ["Flight"], subtype: "flight",
            } as Attraction);
          } else {
            standalone.push({ iata: a.departureAirport, lat: info.lat, lng: info.lng });
          }
        }
      }

      // Arrival airport — user arrives here
      const arrDate = a.arrivalTime?.split("T")[0] ?? null;
      if (arrDate === selectedDay && a.arrivalAirport && !seen.has(`arr_${a.arrivalAirport}`)) {
        seen.add(`arr_${a.arrivalAirport}`);
        const info = lookupAirport(a.arrivalAirport);
        if (info) {
          if (info.country === tripCountry) {
            arrivals.push({
              _id: `__airport_arr_${a.arrivalAirport}`,
              tripId: "", ownerId: "", name: `${a.arrivalAirport} – ${info.city}`,
              country: info.country, city: info.city,
              coordinates: { lat: info.lat, lng: info.lng },
              types: ["Flight"], subtype: "flight",
            } as Attraction);
          } else {
            standalone.push({ iata: a.arrivalAirport, lat: info.lat, lng: info.lng });
          }
        }
      }
    }
    return { arrivalWaypoints: arrivals, departureWaypoints: departures, standaloneAirports: standalone };
  }, [selectedDay, attractions, trip.country]);

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

  // Full route:
  //   arrival airports → residence (or not if arrived today) → attractions → residence (or not if departing today) → departure airports
  const dayResidence = dayResidences[0] ?? null;
  const fullRoute = useMemo<Attraction[]>(() => {
    const start = arrivalWaypoints.length > 0 ? arrivalWaypoints : (dayResidence ? [dayResidence] : []);
    const end   = departureWaypoints.length > 0 ? departureWaypoints : (dayResidence ? [dayResidence] : []);
    return [...start, ...routeAttractions, ...end];
  }, [arrivalWaypoints, departureWaypoints, dayResidence, routeAttractions]);

  // legModes keyed by "${fromId}__${toId}" (mode-independent stable key)
  function stableLegKey(fromId: string, toId: string) { return `${fromId}__${toId}`; }
  function modeForLeg(fromId: string, toId: string): TravelMode {
    return legModes[stableLegKey(fromId, toId)] ?? "walk";
  }
  function setLegMode(fromId: string, toId: string, mode: TravelMode) {
    setLegModes((p) => ({ ...p, [stableLegKey(fromId, toId)]: mode }));
  }

  // Airport waypoint IDs use a fixed prefix — routing through airport grounds is unreliable
  function isAirportId(id: string) { return id.startsWith("__airport_"); }

  // Fetch real route geometry for each leg
  useEffect(() => {
    const aborted = { cancelled: false };
    (async () => {
      const pending: Promise<void>[] = [];
      for (let i = 0; i < fullRoute.length - 1; i++) {
        const from = fullRoute[i];
        const to   = fullRoute[i + 1];
        if (!from.coordinates || !to.coordinates) continue;
        const mode = modeForLeg(from._id, to._id);
        const key  = legKey(from._id, to._id, mode);
        if (routeCache[key] !== undefined || loadingKeysRef.current.has(key)) continue;

        loadingKeysRef.current.add(key);
        const isAirportLeg = isAirportId(from._id) || isAirportId(to._id);

        // Airport legs:
        //  • Transit: uses terminal coords (stored in from/to.coordinates) so Transitous
        //    finds the correct bus stops (100E etc.).
        //  • Walk/car: use road-accessible car coords (avoids slow terminal-internal roads
        //    in Valhalla), then route via car since pedestrian fails on airport grounds.
        let fc: { lat: number; lng: number } = from.coordinates!;
        let tc: { lat: number; lng: number } = to.coordinates!;
        if (isAirportLeg && mode !== "transit") {
          const carFrom = isAirportId(from._id) ? getAirportCarCoord(from._id) : null;
          const carTo   = isAirportId(to._id)   ? getAirportCarCoord(to._id)   : null;
          if (carFrom) fc = carFrom;
          if (carTo)   tc = carTo;
        }

        const fetcher = (isAirportLeg && mode !== "transit")
          ? () => fetchAirportLeg(fc, tc)
          : () => fetchRouteLeg(fc, tc, mode, selectedDay || undefined);

        pending.push(
          fetcher().then((leg) => {
            if (!aborted.cancelled) {
              loadingKeysRef.current.delete(key);
              setRouteCache((prev) => ({ ...prev, [key]: leg ?? null }));
            }
          })
        );
      }
      await Promise.all(pending);
    })();
    return () => { aborted.cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullRoute, legModes, selectedDay]);

  const bounds = useMemo(() => {
    const allCoords: [number, number][] = [
      ...mapped.map((a) => [a.coordinates!.lat, a.coordinates!.lng] as [number, number]),
      ...dayResidences.map((r) => [r.coordinates!.lat, r.coordinates!.lng] as [number, number]),
      ...arrivalWaypoints.map((ap) => [ap.coordinates!.lat, ap.coordinates!.lng] as [number, number]),
      ...departureWaypoints.map((ap) => [ap.coordinates!.lat, ap.coordinates!.lng] as [number, number]),
      ...standaloneAirports.map((ap) => [ap.lat, ap.lng] as [number, number]),
    ];
    if (allCoords.length === 0) return L.latLngBounds([[0, 0], [0, 0]]);
    if (allCoords.length === 1) {
      const [lat, lng] = allCoords[0];
      return L.latLngBounds([[lat - 0.01, lng - 0.01], [lat + 0.01, lng + 0.01]]);
    }
    return L.latLngBounds(allCoords);
  }, [mapped, dayResidences]);

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
                  const color = colorForType(a.types?.[0] ?? "");
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
        {selectedDay && (mapped.length > 0 || dayResidences.length > 0 || arrivalWaypoints.length > 0 || departureWaypoints.length > 0 || standaloneAirports.length > 0) && (
          <MapContainer
            key={`${selectedDay}_${arrivalWaypoints.length}_${departureWaypoints.length}`}
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
                  icon={makeMarkerIcon(a.types, order, isAlt, colorForType, findType(a.types?.[0] ?? "")?.icon ?? "")}
                >
                  <Tooltip direction="top" offset={[0, -14]}>
                    <strong>{a.name}</strong>
                    {a.plannedTime ? ` · ${a.plannedTime}` : ""}
                  </Tooltip>
                </Marker>
              );
            })}

            {/* Standalone airport markers (different country — no route connection) */}
            {standaloneAirports.map((ap) => {
              const info = lookupAirport(ap.iata);
              return (
                <Marker key={ap.iata} position={[ap.lat, ap.lng]} icon={makeAirportMarkerIcon(ap.iata)}>
                  <Tooltip direction="top" offset={[0, -17]}>
                    <strong>{ap.iata}</strong>{" · "}{info?.name ?? "Airport"}
                    {info?.city ? `, ${info.city}` : ""}
                  </Tooltip>
                </Marker>
              );
            })}
            {/* Same-country airport markers — part of the route */}
            {[...arrivalWaypoints, ...departureWaypoints].map((ap) => {
              const iata = ap.name.split(" – ")[0];
              const info = lookupAirport(iata);
              return (
                <Marker
                  key={ap._id}
                  position={[ap.coordinates!.lat, ap.coordinates!.lng]}
                  icon={makeAirportMarkerIcon(iata)}
                >
                  <Tooltip direction="top" offset={[0, -17]}>
                    <strong>{iata}</strong>{" · "}{info?.name ?? "Airport"}
                    {info?.city ? `, ${info.city}` : ""}
                  </Tooltip>
                </Marker>
              );
            })}

            {/* Residence markers — "home base" for the day */}
            {dayResidences.map((r) => (
              <Marker
                key={r._id}
                position={[r.coordinates!.lat, r.coordinates!.lng]}
                icon={makeResidenceMarkerIcon()}
              >
                <Tooltip direction="top" offset={[0, -16]}>
                  <strong>{r.name}</strong>
                  {" · "}Staying here
                  {r.checkInDate && r.checkOutDate
                    ? ` (${r.checkInDate} – ${r.checkOutDate})`
                    : ""}
                </Tooltip>
              </Marker>
            ))}

            {/* Main route polylines — real OSRM geometry when available */}
            {fullRoute.slice(0, -1).map((a, i) => {
              if (a === fullRoute[i + 1]) return null; // skip degenerate same-point legs
              const next = fullRoute[i + 1];
              if (!a.coordinates || !next.coordinates) return null;
              const mode = modeForLeg(a._id, next._id);
              const cacheKey = legKey(a._id, next._id, mode);
              const cached    = routeCache[cacheKey] ?? null;
              const isPending = routeCache[cacheKey] === undefined;
              const positions: [number, number][] = cached?.geometry ??
                [[a.coordinates.lat, a.coordinates.lng], [next.coordinates.lat, next.coordinates.lng]];
              // Use walk color when transit fell back
              const effectiveMode = cached?.transitUnavailable ? "walk" : mode;
              const color = isPending ? "#94A3B8" : effectiveMode === "transit" ? "#8B5CF6" : effectiveMode === "car" ? "#F59E0B" : "#0EA5E9";
              const leg = cached;
              return (
                <React.Fragment key={`leg-${a._id}-${i}`}>
                  <Polyline
                    positions={positions}
                    pathOptions={{ color, weight: cached ? 4 : 2, opacity: cached ? 0.9 : 0.45, dashArray: isPending ? "6 4" : undefined }}
                  />
                  {leg && (
                    <TransitLabel
                      from={a.coordinates}
                      to={next.coordinates}
                      label={formatLegDuration(leg)}
                    />
                  )}
                </React.Fragment>
              );
            })}

            {/* Conflict alternate polylines — always straight dashed lines */}
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

      {/* Route legs panel — step breakdown */}
      {fullRoute.length >= 2 && (
        <div className={styles.legPanel}>
          {fullRoute.slice(0, -1).map((a, i) => {
            const next = fullRoute[i + 1];
            if (a === next) return null;
            if (!a.coordinates || !next.coordinates) return null;
            const mode     = modeForLeg(a._id, next._id);
            const cacheKey = legKey(a._id, next._id, mode);
            const cached    = routeCache[cacheKey] ?? null;
            const isLoading = routeCache[cacheKey] === undefined;
            return (
              <div key={`legrow-${a._id}-${i}`} className={styles.legRow}>
                {/* Leg header: name + mode selector (hidden for airport legs) + total time */}
                <div className={styles.legHeader}>
                  <span className={styles.legName}>{a.name} → {next.name}</span>
                  <div className={styles.legRight}>
                    <div className={styles.modeGroup} role="group" aria-label={`Travel mode from ${a.name} to ${next.name}`}>
                      <button type="button"
                        className={`${styles.modeBtn} ${mode === "walk"    ? styles.modeBtnActive : ""}`}
                        onClick={() => setLegMode(a._id, next._id, "walk")}
                        aria-pressed={mode === "walk"} aria-label="Walk">
                        <Footprints size={14} aria-hidden="true" />
                      </button>
                      <button type="button"
                        className={`${styles.modeBtn} ${mode === "car"     ? styles.modeBtnActive : ""}`}
                        onClick={() => setLegMode(a._id, next._id, "car")}
                        aria-pressed={mode === "car"} aria-label="Drive">
                        <Car size={14} aria-hidden="true" />
                      </button>
                      <button type="button"
                        className={`${styles.modeBtn} ${mode === "transit" ? styles.modeBtnActive : ""}`}
                        onClick={() => setLegMode(a._id, next._id, "transit")}
                        aria-pressed={mode === "transit"} aria-label="Public transport">
                        <Bus size={14} aria-hidden="true" />
                      </button>
                    </div>
                    <span className={styles.legTime}>
                      {isLoading
                        ? <Loader2 size={12} className={styles.legSpinner} aria-label="Loading route…" />
                        : cached ? formatLegDuration(cached) : "—"}
                    </span>
                  </div>
                </div>
                {/* Step breakdown */}
                {cached && cached.steps.length > 0 && (
                  <ol className={styles.stepList}>
                    {cached.steps.map((step, si) => (
                      <li key={si} className={styles.stepItem}>
                        <span className={styles.stepIcon} aria-hidden="true">
                          {step.icon === "walk"    ? <Footprints size={11} /> :
                           step.icon === "transit" ? <Bus size={11} />        :
                                                     <Car size={11} />}
                        </span>
                        {step.badge && (
                          <span className={styles.stepBadge} aria-label={`Line ${step.badge}`}>
                            {step.badge}
                          </span>
                        )}
                        <span className={styles.stepLabel}>{step.label}</span>
                        <span className={styles.stepTime}>{formatStepDuration(step.durationSec)}</span>
                      </li>
                    ))}
                  </ol>
                )}
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
