export type TravelMode = "walk" | "car" | "transit";

export interface RouteStep {
  icon: "walk" | "drive" | "transit";
  label: string;
  badge?: string;     // transit line number/name, displayed prominently
  durationSec: number;
}

export interface RouteLeg {
  geometry: [number, number][];  // [lat, lng] pairs for Leaflet
  durationSec: number;
  steps: RouteStep[];
  transitUnavailable?: boolean; // true when requested transit but fell back to walking
}

type Coord = { lat: number; lng: number };

// ── Polyline decoder ──────────────────────────────────────────────────────────
// Supports variable precision: Google / Valhalla use precision=5 (÷1e5),
// Transitous (MOTIS) uses precision=7 (÷1e7) — always check legGeometry.precision.
function decodePolyline(encoded: string, precision = 5): [number, number][] {
  const divisor = Math.pow(10, precision);
  const result: [number, number][] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < encoded.length) {
    let b: number, shift = 0, val = 0;
    do { b = encoded.charCodeAt(i++) - 63; val |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += val & 1 ? ~(val >> 1) : val >> 1;
    shift = 0; val = 0;
    do { b = encoded.charCodeAt(i++) - 63; val |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += val & 1 ? ~(val >> 1) : val >> 1;
    result.push([lat / divisor, lng / divisor]);
  }
  return result;
}

function fmt(sec: number): string {
  const m = Math.round(sec / 60);
  if (m < 1) return "< 1 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h} h` : `${h} h ${rem} min`;
}

export function formatLegDuration(leg: RouteLeg): string { return fmt(leg.durationSec); }
export function formatStepDuration(sec: number): string   { return fmt(sec); }

// ── Shared timeout helper ─────────────────────────────────────────────────────

function timedFetch(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

// ── Valhalla — walking & driving ─────────────────────────────────────────────
// Uses the free public Valhalla instance at valhalla1.openstreetmap.de.
// The OSRM public demo only has the car profile, giving car-speed times for ALL
// requests (including foot) — Valhalla provides correct pedestrian routing.

async function fetchValhallhaLeg(from: Coord, to: Coord, mode: "walk" | "car"): Promise<RouteLeg | null> {
  const costing = mode === "car" ? "auto" : "pedestrian";
  const body = JSON.stringify({
    locations: [{ lat: from.lat, lon: from.lng }, { lat: to.lat, lon: to.lng }],
    costing,
    directions_options: { units: "km" },
  });
  try {
    const res = await timedFetch("https://valhalla1.openstreetmap.de/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }, 8000);
    if (!res.ok) return null;
    const data = await res.json() as {
      trip?: {
        legs?: { shape: string; summary: { time: number } }[];
        status?: number;
      };
    };
    // Check for legs directly — the status field is absent in some Valhalla versions
    const leg = data.trip?.legs?.[0];
    if (!leg) return null;
    // valhalla1.openstreetmap.de uses polyline6 (÷1e6) for ALL costing types
    const geometry = decodePolyline(leg.shape, 6);
    return {
      geometry,
      durationSec: leg.summary.time,
      steps: [{
        icon: mode === "car" ? "drive" : "walk",
        label: mode === "car" ? "Drive" : "Walk",
        durationSec: leg.summary.time,
      }],
    };
  } catch {
    return null;
  }
}

// ── Transitous — public transit (OTP2 / MOTIS format, free, no key) ──────────

interface OtpLeg {
  mode: string;
  duration: number;
  from: { name: string };
  to:   { name: string };
  routeShortName?: string;
  routeLongName?: string;
  legGeometry: { points: string; precision?: number };
}

const TRANSIT_MODES = new Set(["BUS", "SUBWAY", "RAIL", "TRAM", "FERRY", "METRO",
  "GONDOLA", "FUNICULAR", "CABLE_CAR", "COACH", "FLEX"]);

async function fetchTransitLeg(from: Coord, to: Coord, date?: string): Promise<RouteLeg | null> {
  // Transitous supports `date` (YYYY-MM-DD) but rejects any `time` parameter format.
  const d = date ?? new Date().toISOString().split("T")[0];
  const url =
    `https://api.transitous.org/api/v1/plan` +
    `?fromPlace=${from.lat},${from.lng}` +
    `&toPlace=${to.lat},${to.lng}` +
    `&date=${d}` +
    `&mode=TRANSIT,WALK&numItineraries=1`;
  try {
    // Transitous can be slow for complex itineraries; 15s timeout prevents endless loading
    const res = await timedFetch(url, {}, 15000);
    if (!res.ok) return null;
    // Transitous returns itineraries at the root level — NOT nested inside a "plan" wrapper
    const data = await res.json() as { itineraries?: { duration: number; legs: OtpLeg[] }[] };
    const itinerary = data.itineraries?.[0];

    // Sanity-check the result: reject itineraries that contain airplane legs
    // or exceed 6 hours (Transitous sometimes routes internationally when near airports)
    const isPlausible = itinerary &&
      itinerary.duration <= 6 * 3600 &&
      !itinerary.legs.some((l) => l.mode === "AIRPLANE");

    if (!isPlausible) {
      // No usable transit route — try walk, then car as final fallback
      const walk = await fetchValhallhaLeg(from, to, "walk");
      if (walk) {
        return {
          ...walk,
          transitUnavailable: true,
          steps: [{ icon: "walk" as const, label: "Walk (no transit on this route)", durationSec: walk.durationSec }],
        };
      }
      // Pedestrian routing failed (e.g. airport restricted grounds) — use car as last resort
      const car = await fetchValhallhaLeg(from, to, "car");
      if (!car) return null;
      return {
        ...car,
        transitUnavailable: true,
        steps: [{ icon: "drive" as const, label: "Ground transport – no transit data (car estimate)", durationSec: car.durationSec }],
      };
    }

    // Concatenate per-leg geometries into one continuous path.
    // Transitous uses precision=7 (÷1e7); read it from each leg's metadata.
    const geometry: [number, number][] = [];
    for (const leg of itinerary.legs) {
      const precision = leg.legGeometry.precision ?? 5;
      const pts = decodePolyline(leg.legGeometry.points, precision);
      if (geometry.length > 0 && pts.length > 0) pts.shift();
      geometry.push(...pts);
    }

    const steps: RouteStep[] = itinerary.legs
      .filter((leg) => leg.duration > 10)
      .map((leg): RouteStep => {
        if (TRANSIT_MODES.has(leg.mode)) {
          const line = leg.routeShortName ?? leg.routeLongName ?? leg.mode;
          return {
            icon:   "transit",
            badge:  line,                                   // displayed prominently
            label:  `${leg.from.name} → ${leg.to.name}`,
            durationSec: leg.duration,
          };
        }
        return {
          icon:  "walk",
          label: `Walk to ${leg.to.name}`,
          durationSec: leg.duration,
        };
      });

    return { geometry, durationSec: itinerary.duration, steps };
  } catch {
    return null;
  }
}

// ── Public entry points ───────────────────────────────────────────────────────

export async function fetchRouteLeg(
  from: Coord,
  to: Coord,
  mode: TravelMode,
  date?: string   // "YYYY-MM-DD" for transit schedule accuracy
): Promise<RouteLeg | null> {
  if (mode === "transit") return fetchTransitLeg(from, to, date);
  return fetchValhallhaLeg(from, to, mode);
}

// Airport-to-city legs: pedestrian routing fails on restricted airport grounds
// and transit produces intercontinental flight routes. Car (ground transport) is
// the only reliable option.
export async function fetchAirportLeg(from: Coord, to: Coord): Promise<RouteLeg | null> {
  const leg = await fetchValhallhaLeg(from, to, "car");
  if (!leg) return null;
  return {
    ...leg,
    // Note: Valhalla uses posted speed limits; actual travel time (with motorway)
    // is typically 30–40% faster than shown here.
    steps: [{ icon: "drive" as const, label: "Ground transport (taxi/car — based on speed limits, actual may be faster)", durationSec: leg.durationSec }],
  };
}
