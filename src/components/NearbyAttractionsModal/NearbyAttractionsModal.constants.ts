export const DEFAULT_MAX_MINUTES = 20;
export const MAX_MINUTES_PRESETS = [10, 20, 30] as const;

// Caps how many candidates ever get a real routing API call, regardless of how many
// fall within the haversine pre-filter radius — a dense city can have far more
// candidates within a generous radius than it's reasonable to call the (rate-limited,
// public) routing service for. Closest-by-straight-line candidates are kept first.
export const MAX_ROUTING_CANDIDATES = 20;
// How many routing calls run in parallel — the public Valhalla instance this app
// calls returns 429 (Too Many Requests) on an unthrottled burst even at this list size.
export const ROUTING_CONCURRENCY = 3;

// Coarse haversine pre-filter, applied before the real (much slower) per-candidate
// routing calls — deliberately generous so it never excludes a true match; it only
// exists to shrink the candidate pool before hitting the routing API N times.
export const ASSUMED_URBAN_SPEED_KMH = 40;
export const PREFILTER_SAFETY_FACTOR = 1.5;
