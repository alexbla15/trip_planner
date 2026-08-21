import type { Attraction } from "@/types/attraction";
import { haversineKm } from "@/lib";
import { fetchRouteLeg } from "@/services";
import type { NearbySuggestion } from "./NearbyAttractionsModal.types";
import {
  ASSUMED_URBAN_SPEED_KMH,
  PREFILTER_SAFETY_FACTOR,
  MAX_ROUTING_CANDIDATES,
  ROUTING_CONCURRENCY,
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

/** Runs `task` over `items` with at most `limit` in flight at once — the public
 *  Valhalla routing instance this app uses rate-limits (429s) an unthrottled
 *  Promise.all across even a modest candidate list. */
async function runWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await task(items[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export interface NearbySearchResult {
  suggestions: NearbySuggestion[];
  /** Candidates whose routing call failed or returned no route — surfaced to the UI
   *  so a rate-limited/unavailable routing service reads as "some places couldn't be
   *  checked," not as "there are truly no nearby attractions." */
  failedCount: number;
}

/** Routes the origin to every shortlisted candidate (throttled, not all at once),
 *  keeping only those within `maxMinutes` by actual drive time, sorted nearest-first. */
export async function findNearbySuggestions(
  origin: Attraction,
  shortlist: Attraction[],
  maxMinutes: number
): Promise<NearbySearchResult> {
  if (!origin.coordinates) return { suggestions: [], failedCount: 0 };
  const originCoords = origin.coordinates;

  const legs = await runWithConcurrencyLimit(shortlist, ROUTING_CONCURRENCY, async (attraction) => {
    if (!attraction.coordinates) return null;
    try {
      const leg = await fetchRouteLeg(originCoords, attraction.coordinates, "car");
      return leg ? { attraction, durationSec: leg.durationSec } : null;
    } catch {
      return null;
    }
  });

  const suggestions = legs
    .filter((s): s is NearbySuggestion => s != null && s.durationSec <= maxMinutes * 60)
    .sort((a, b) => a.durationSec - b.durationSec);
  const failedCount = legs.filter((s) => s == null).length;

  return { suggestions, failedCount };
}
