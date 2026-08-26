import type { Attraction } from "@/types/attraction";

/** For map surfaces that plot one pin per attraction from a browsable list (Explore,
 *  trip Explore tab): a nested (parent/child, any depth) attraction shares its top-level
 *  ancestor's exact coordinates, so plotting both is a redundant, stacked pin. Suppress a
 *  child's own pin only when its top-level ancestor is also present in the same list —
 *  if the ancestor isn't in this particular list (e.g. only the child matched the active
 *  filters), the child still gets its own pin so it isn't silently dropped from the map. */
export function filterTopLevelMapPins<T extends Pick<Attraction, "_id" | "parentAttractionId" | "coordinates">>(
  attractions: T[],
): T[] {
  const topLevelCoordKeys = new Set(
    attractions
      .filter((a) => !a.parentAttractionId && a.coordinates)
      .map((a) => `${a.coordinates!.lat},${a.coordinates!.lng}`)
  );
  return attractions.filter((a) => {
    if (!a.parentAttractionId) return true;
    if (!a.coordinates) return true;
    return !topLevelCoordKeys.has(`${a.coordinates.lat},${a.coordinates.lng}`);
  });
}
