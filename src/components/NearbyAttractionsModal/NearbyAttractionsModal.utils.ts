import type { Attraction } from "@/types/attraction";
import { haversineKm } from "@/lib";
import { fetchRouteMatrix } from "@/services";
import type { NearbySuggestion } from "./NearbyAttractionsModal.types";
import {
  ASSUMED_URBAN_SPEED_KMH,
  PREFILTER_SAFETY_FACTOR,
  MAX_ROUTING_CANDIDATES,
} from "./NearbyAttractionsModal.constants";

/** Generous straight-line radius a real drive of `maxMinutes` could plausibly stay
 *  within — used only to shrink the candidate pool before the real routing calls,
 *  never as the actual filter (a real road route is always >= the straight line). */
export function haversinePrefilterRadiusKm(maxMinutes: number): number {
  return (maxMinutes / 60) * ASSUMED_URBAN_SPEED_KMH * PREFILTER_SAFETY_FACTOR;
}

/** Narrows raw city-scoped candidates down to those worth a real routing call: has
 *  coordinates, isn't the origin itself, isn't already on the trip, and falls within
 *  the generous haversine pre-filter radius — then caps to the closest
 *  MAX_ROUTING_CANDIDATES by straight-line distance. The cap matters independently of
 *  the radius: a dense city can have far more candidates within a generous radius than
 *  it's reasonable to fire routing API calls for, regardless of how tight the radius is. */
export function prefilterCandidates(
  origin: Attraction,
  candidates: Attraction[],
  excludeIds: Set<string>,
  maxMinutes: number
): Attraction[] {
  if (!origin.coordinates) return [];
  const originCoords = origin.coordinates;
  const originId = origin.attractionId ?? origin._id;
  const radiusKm = haversinePrefilterRadiusKm(maxMinutes);

  return candidates
    .filter((c) => {
      if (!c.coordinates) return false;
      const id = c.attractionId ?? c._id;
      if (id === originId || excludeIds.has(id)) return false;
      return haversineKm(originCoords, c.coordinates) <= radiusKm;
    })
    .sort((a, b) => haversineKm(originCoords, a.coordinates!) - haversineKm(originCoords, b.coordinates!))
    .slice(0, MAX_ROUTING_CANDIDATES);
}

/** Formats a max-drive-time preset value for chip labels — minute presets read as
 *  "10 min", but an even-hour preset (e.g. 60) reads better as "1 hr". */
export function formatMaxMinutesLabel(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hr`;
  }
  return `${minutes} min`;
}

export interface NearbySearchResult {
  suggestions: NearbySuggestion[];
  /** Candidates whose routing call failed or returned no route — surfaced to the UI
   *  so a rate-limited/unavailable routing service reads as "some places couldn't be
   *  checked," not as "there are truly no nearby attractions." */
  failedCount: number;
}

/** Routes the origin to every shortlisted candidate in a single matrix request
 *  (OSRM Table service), keeping only those within `maxMinutes` by actual drive
 *  time, sorted nearest-first. */
export async function findNearbySuggestions(
  origin: Attraction,
  shortlist: Attraction[],
  maxMinutes: number
): Promise<NearbySearchResult> {
  if (!origin.coordinates) return { suggestions: [], failedCount: 0 };
  const originCoords = origin.coordinates;

  const routable = shortlist.filter((a): a is Attraction & { coordinates: NonNullable<Attraction["coordinates"]> } => !!a.coordinates);
  const durations = await fetchRouteMatrix(originCoords, routable.map((a) => a.coordinates), "car");

  const suggestions: NearbySuggestion[] = [];
  let failedCount = 0;
  routable.forEach((attraction, i) => {
    const durationSec = durations[i];
    if (durationSec == null) {
      failedCount++;
      return;
    }
    if (durationSec <= maxMinutes * 60) suggestions.push({ attraction, durationSec });
  });
  suggestions.sort((a, b) => a.durationSec - b.durationSec);

  return { suggestions, failedCount };
}
