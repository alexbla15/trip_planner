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

/** Resolves and validates a would-be parent link for create/update — throws a 400 with a
 *  clear message on any violation: parent doesn't exist, the caller explicitly named a
 *  different country than the parent's own (a child's coordinates/city/country are
 *  inherited from the parent, so a client-specified country contradicting the parent would
 *  otherwise silently be discarded in favor of the parent's — better to reject the
 *  contradiction outright), or the chosen parent is itself already a child (nesting is one
 *  level only — a child can't itself be a parent). `requestingCountry` is optional: when
 *  the caller didn't send a country at all (the common case — relying on inheritance),
 *  there's nothing to cross-check, so the parent's country is trusted unconditionally. */
export async function resolveParentLink(parentAttractionId: string, requestingCountry?: string): Promise<IAttraction> {
  await dbConnect();
  const parent = await Attraction.findById(parentAttractionId);
  if (!parent) throw badRequest("Parent attraction not found");
  if (requestingCountry?.trim() && parent.country.trim().toLowerCase() !== requestingCountry.trim().toLowerCase()) {
    throw badRequest("Parent attraction must be in the same country");
  }
  if (parent.parentAttractionId) {
    throw badRequest("Cannot nest an attraction inside another child attraction — only one level of nesting is allowed");
  }
  return parent;
}
