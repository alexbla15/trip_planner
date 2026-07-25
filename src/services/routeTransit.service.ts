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
  const params = `fromLat=${from.lat}&fromLng=${from.lng}&toLat=${to.lat}&toLng=${to.lng}&mode=${mode}`;
  try {
    const res = await timedFetch(`/api/route/valhalla?${params}`, {}, 12000);
    if (!res.ok) return null;
    const data = await res.json() as {
      code?: string;
      routes?: { duration: number; geometry: { coordinates: [number, number][] } }[];
    };
    if (data.code !== "Ok" || !data.routes?.[0]) return null;
    const route = data.routes[0];
    // OSRM returns [lng, lat]; Leaflet needs [lat, lng]
    const geometry: [number, number][] = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    return {
      geometry,
      durationSec: route.duration,
      steps: [{
        icon: mode === "car" ? "drive" : "walk",
        label: mode === "car" ? "Drive" : "Walk",
        durationSec: route.duration,
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

const TRANSIT_MODES = new Set([
  "BUS", "SUBWAY", "RAIL", "REGIONAL_RAIL", "TRAM", "FERRY", "METRO",
  "GONDOLA", "FUNICULAR", "CABLE_CAR", "COACH", "FLEX",
  "INTERCITY", "LONG_DISTANCE", "NIGHT_RAIL", "REGIONAL_FAST_RAIL",
  "OTHER", // used by Transitous for shuttles like the Luton DART
]);

async function fetchTransitLeg(from: Coord, to: Coord, date?: string): Promise<RouteLeg | null> {
  // Transitous supports `date` (YYYY-MM-DD) but rejects any `time` parameter format.
  const d = date ?? new Date().toISOString().split("T")[0];
  const params =
    `fromPlace=${from.lat},${from.lng}` +
    `&toPlace=${to.lat},${to.lng}` +
    `&date=${d}` +
    `&mode=TRANSIT,WALK&numItineraries=3`;
  // Shared fallback: transit unavailable → try walk, then car
  async function transitFallback(label: string): Promise<RouteLeg | null> {
    const walk = await fetchValhallhaLeg(from, to, "walk");
    if (walk) {
      return {
        ...walk,
        transitUnavailable: true,
        steps: [{ icon: "walk" as const, label, durationSec: walk.durationSec }],
      };
    }
    const car = await fetchValhallhaLeg(from, to, "car");
    if (!car) return null;
    return {
      ...car,
      transitUnavailable: true,
      steps: [{ icon: "drive" as const, label: "Ground transport – no transit data (car estimate)", durationSec: car.durationSec }],
    };
  }

  try {
    // Transitous can be slow for complex itineraries; 20s client timeout > 18s server timeout
    const res = await timedFetch(`/api/route/transit?${params}`, {}, 20000);
    if (!res.ok) {
      // Transit service returned an error — fall back rather than leaving the leg empty
      return transitFallback("Walk (transit service error — no data for this route)");
    }
    // Transitous returns itineraries at the root level — NOT nested inside a "plan" wrapper
    const data = await res.json() as { itineraries?: { duration: number; legs: OtpLeg[] }[] };

    // Pick the first plausible itinerary: no airplane legs, under 6 hours.
    // Requesting 3 lets us skip implausible first results (e.g. international connection via airport).
    const itinerary = data.itineraries?.find(
      (itin) => itin.duration <= 6 * 3600 && !itin.legs.some((l) => l.mode === "AIRPLANE")
    );

    if (!itinerary) {
      return transitFallback("Walk (no transit on this route)");
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
    return transitFallback("Walk (transit unavailable — routing error)");
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
