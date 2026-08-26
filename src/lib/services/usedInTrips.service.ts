import { dbConnect } from "@/lib/mongoose";
import { Trip } from "@/models/Trip";

/** Maps each attraction id to the name(s) of this user's trips (owned OR
 *  collaborated-on) that already include it — for merging `usedInTripNames` onto a
 *  list of attractions in one query, mirroring `getVisitedIdSet` in
 *  `visited.service.ts`. Returns an empty map immediately for an anonymous caller. */
export async function getUsedInTripsMap(userId: string | null): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!userId) return map;
  await dbConnect();
  const trips = await Trip.find({
    $or: [{ ownerId: userId }, { "collaborators.userId": userId }],
  }).select("name attractionIds").lean();
  for (const trip of trips) {
    for (const id of trip.attractionIds ?? []) {
      const key = id.toString();
      const names = map.get(key);
      if (names) names.push(trip.name); else map.set(key, [trip.name]);
    }
  }
  return map;
}

/** Real doc ids of attractions used in any of this user's trips (owned OR
 *  collaborated-on) — for merging `usedInTrip` onto a list/aggregate in one query
 *  when only membership (not which trip) is needed, mirroring `getVisitedIdSet` in
 *  `visited.service.ts`. */
export async function getUsedInTripIdSet(userId: string | null): Promise<Set<string>> {
  const map = await getUsedInTripsMap(userId);
  return new Set(map.keys());
}

/** Trip names for a single attraction — cheaper than `getUsedInTripsMap` when only
 *  one doc's status is needed (e.g. after a PUT/create), mirroring
 *  `isAttractionVisited` in `visited.service.ts`. Matches trips the user owns OR
 *  collaborates on. */
export async function getUsedInTripNames(userId: string | null, attractionId: string): Promise<string[]> {
  if (!userId) return [];
  await dbConnect();
  const trips = await Trip.find({
    $or: [{ ownerId: userId }, { "collaborators.userId": userId }],
    attractionIds: attractionId,
  }).select("name").lean();
  return trips.map((t) => t.name);
}
