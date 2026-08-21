export const DEFAULT_MAX_MINUTES = 20;
export const MAX_MINUTES_PRESETS = [10, 20, 30, 60] as const;

// Caps how many candidates go into the single matrix routing request, regardless
// of how many fall within the haversine pre-filter radius. The public OSRM instance's
// usage policy counts each table *entry* as one request toward its rate limit — so a
// higher cap here isn't free just because it's one HTTP call. Closest-by-straight-line
// candidates are kept first.
export const MAX_ROUTING_CANDIDATES = 15;

// Coarse haversine pre-filter, applied before the real (much slower) per-candidate
// routing calls — deliberately generous so it never excludes a true match; it only
// exists to shrink the candidate pool before hitting the routing API N times.
export const ASSUMED_URBAN_SPEED_KMH = 40;
export const PREFILTER_SAFETY_FACTOR = 1.5;
