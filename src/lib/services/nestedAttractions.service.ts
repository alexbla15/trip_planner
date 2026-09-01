import { Types } from "mongoose";
import { dbConnect } from "@/lib/mongoose";
import { badRequest } from "@/lib/apiError";
import { Attraction, type IAttraction } from "@/models/Attraction";

/** Maps each parent attraction id (string) to its name — for resolving
 *  `parentAttractionName` onto a list of children in one query, mirroring the batched-Map
 *  pattern in visited.service.ts/usedInTrips.service.ts. Unlike those, this isn't
 *  per-user — a parent's name is intrinsic to the attraction, not a per-caller fact. */
export async function getParentNameMap(parentIds: (string | null | undefined)[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const uniqueIds = [...new Set(parentIds.filter((id): id is string => !!id))];
  if (uniqueIds.length === 0) return map;
  await dbConnect();
  const parents = await Attraction.find({ _id: { $in: uniqueIds } }).select("name").lean();
  for (const p of parents) map.set(p._id.toString(), p.name);
  return map;
}

/** Name of a single attraction's parent — cheaper than `getParentNameMap` when only one
 *  doc's parent needs resolving (e.g. after a POST/PUT). Returns undefined when
 *  `parentAttractionId` is null/undefined (not a child) or the parent doc is missing. */
export async function getParentName(parentAttractionId: string | null | undefined): Promise<string | undefined> {
  if (!parentAttractionId) return undefined;
  const map = await getParentNameMap([parentAttractionId]);
  return map.get(parentAttractionId);
}

/** Maps each parent attraction id (string) to its photo URL — for resolving a photo
 *  fallback onto children that have no photo of their own (e.g. a specific ride nested
 *  inside a theme park). Mirrors `getParentNameMap`; a separate query rather than folding
 *  into it since most callers only need one of the two fields. Parents without a photo
 *  are simply absent from the map. */
export async function getParentPhotoMap(parentIds: (string | null | undefined)[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const uniqueIds = [...new Set(parentIds.filter((id): id is string => !!id))];
  if (uniqueIds.length === 0) return map;
  await dbConnect();
  const parents = await Attraction.find({ _id: { $in: uniqueIds } }).select("photoUrl").lean();
  for (const p of parents) if (p.photoUrl) map.set(p._id.toString(), p.photoUrl);
  return map;
}

/** Photo URL of a single attraction's parent — cheaper than `getParentPhotoMap` when only
 *  one doc's parent needs resolving. Returns undefined when `parentAttractionId` is
 *  null/undefined, the parent doc is missing, or the parent has no photo. */
export async function getParentPhoto(parentAttractionId: string | null | undefined): Promise<string | undefined> {
  if (!parentAttractionId) return undefined;
  const map = await getParentPhotoMap([parentAttractionId]);
  return map.get(parentAttractionId);
}

/** Maps each attraction id (string) to how many other attractions reference it as their
 *  parent — for resolving `childAttractionCount` onto a list of potential parents in one
 *  query. Children scattered anywhere in the DB are counted, not just within the same
 *  page/batch being formatted. */
export async function getChildCountMap(attractionIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const uniqueIds = [...new Set(attractionIds)];
  if (uniqueIds.length === 0) return map;
  await dbConnect();
  const results = await Attraction.aggregate([
    { $match: { parentAttractionId: { $in: uniqueIds.map((id) => new Types.ObjectId(id)) } } },
    { $group: { _id: "$parentAttractionId", count: { $sum: 1 } } },
  ]);
  for (const r of results) map.set((r._id as Types.ObjectId).toString(), r.count as number);
  return map;
}

/** Child count for a single attraction — cheaper than `getChildCountMap` when only one
 *  doc's count is needed (e.g. after a PUT). */
export async function getChildCount(attractionId: string): Promise<number> {
  const map = await getChildCountMap([attractionId]);
  return map.get(attractionId) ?? 0;
}

/** Walks a parent chain starting at `startId`, following `parentAttractionId` upward,
 *  and returns true if `targetId` appears anywhere in that chain. Used to reject cycles
 *  now that nesting supports arbitrary depth (a chain that could loop back on itself).
 *  Bounded to a sane depth — legitimate nesting chains are a handful of levels, not
 *  hundreds — so a corrupt/cyclic chain can't spin forever. */
async function chainContains(startId: string, targetId: string, maxDepth = 50): Promise<boolean> {
  let currentId: string | null = startId;
  for (let depth = 0; currentId && depth < maxDepth; depth++) {
    if (currentId === targetId) return true;
    const doc: { parentAttractionId?: Types.ObjectId | null } | null =
      await Attraction.findById(currentId).select("parentAttractionId").lean();
    currentId = doc?.parentAttractionId?.toString() ?? null;
  }
  return false;
}

/** Resolves and validates a would-be parent link for create/update — throws a 400 with a
 *  clear message on any violation: parent doesn't exist, the caller explicitly named a
 *  different country than the parent's own (a child's coordinates/city/country are
 *  inherited from the parent, so a client-specified country contradicting the parent would
 *  otherwise silently be discarded in favor of the parent's — better to reject the
 *  contradiction outright), or the chosen parent is a descendant of the attraction being
 *  updated (would create a cycle). Nesting depth is unbounded (any attraction, itself
 *  possibly a child, can be chosen as a parent) — only cycles are rejected.
 *  `requestingCountry` is optional: when the caller didn't send a country at all (the
 *  common case — relying on inheritance), there's nothing to cross-check, so the parent's
 *  country is trusted unconditionally. `selfId` is the attraction being updated (absent on
 *  create, since a brand-new document can't yet be anyone's ancestor). */
export async function resolveParentLink(
  parentAttractionId: string,
  requestingCountry?: string,
  selfId?: string,
): Promise<IAttraction> {
  await dbConnect();
  if (selfId && parentAttractionId === selfId) {
    throw badRequest("An attraction cannot be its own parent");
  }
  const parent = await Attraction.findById(parentAttractionId);
  if (!parent) throw badRequest("Parent attraction not found");
  if (requestingCountry?.trim() && parent.country.trim().toLowerCase() !== requestingCountry.trim().toLowerCase()) {
    throw badRequest("Parent attraction must be in the same country");
  }
  if (selfId && (await chainContains(parentAttractionId, selfId))) {
    throw badRequest("Cannot nest an attraction inside one of its own descendants");
  }
  return parent;
}
