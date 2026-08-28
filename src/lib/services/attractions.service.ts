import { Types } from "mongoose";
import { dbConnect } from "@/lib/mongoose";
import { badRequest, notFound, conflict } from "@/lib/apiError";
import { Attraction, formatAttraction, type IAttraction, type IPriceTier } from "@/models/Attraction";
import { AttractionType } from "@/models/AttractionType";
import { FoodStyle } from "@/models/FoodStyle";
import { Trip, type ITrip, type IScheduleEntry } from "@/models/Trip";
import { getVisitedIdSet, isAttractionVisited } from "@/lib/services/visited.service";
import { getUsedInTripsMap, getUsedInTripNames } from "@/lib/services/usedInTrips.service";
import { getParentNameMap, getParentName, getChildCountMap, getChildCount, resolveParentLink } from "@/lib/services/nestedAttractions.service";
import type { JwtPayload } from "@/lib/auth";
import type { Attraction as AttractionShape, OpeningHours } from "@/types/attraction";

/** Maps a Mongo E11000 duplicate-key error to the same 409 the pre-check already guards
 *  against, in case of a race between the pre-check and the insert/save. The underlying
 *  unique index is on name+coordinates together (see Attraction model), so a real collision
 *  here always means the same name at the same location. */
function throwIfDuplicateKeyError(err: unknown): never {
  const msg = (err as Error)?.message ?? "";
  if (msg.includes("E11000")) {
    throw conflict("An attraction with this name already exists at this location");
  }
  throw err;
}

/** Validates and normalizes a client-supplied price-tier list: at least one tier, exactly
 *  one flagged primary (the first tier is promoted automatically if the client didn't mark
 *  one — a client bug shouldn't be a 400, since "primary" is a display convenience, not a
 *  business rule the client can violate meaningfully). Returns the normalized tiers plus
 *  the primary tier's amount, which callers sync onto the legacy `price` field so every
 *  existing single-price consumer (cards, budget calculations) keeps working unchanged. */
function normalizePriceTiers(tiers: { label: string; amount: number; isPrimary?: boolean }[]): {
  prices: IPriceTier[];
  primaryAmount: number;
} {
  if (tiers.length === 0) throw badRequest("At least one price tier is required");
  const hasPrimary = tiers.some((t) => t.isPrimary);
  const prices: IPriceTier[] = tiers.map((t, i) => ({
    label: t.label.trim(),
    amount: t.amount,
    isPrimary: hasPrimary ? !!t.isPrimary : i === 0,
  }));
  const primary = prices.find((t) => t.isPrimary)!;
  return { prices, primaryAmount: primary.amount };
}

export interface SearchAttractionsParams {
  country?: string | null;
  city?: string | null;
  q?: string | null;
  type?: string | null;
  ownerId?: string | null;
  /** Restricts results to the direct children of this attraction (see
   *  `nestedAttractions.service.ts` — one level of nesting only). Satisfies the "at
   *  least one filter" gate on its own, same as country/city/type. */
  parentAttractionId?: string | null;
  /** Pagination — skip/limit. limit is capped at the per-query-shape default cap below,
   *  so pagination narrows the page size, never exceeds the pre-existing result cap. */
  skip?: number | null;
  limit?: number | null;
  /** Skips the "hidden by private trip" filter below. Attractions are global, shared
   *  place records — not private trip-planning details — so a public discovery view
   *  (Explore's city drill-down) should never hide one just because the only trip
   *  referencing it happens to be private. Defaults to false (the existing filtered
   *  behavior) for every other caller, e.g. trip-scoped attraction search/pickers,
   *  where avoiding a private-trip-only attraction leaking into another user's search
   *  is still the right behavior. */
  includeHidden?: boolean | null;
}

export interface SearchAttractionsResult {
  items: IAttraction[];
  total: number;
  skip: number;
  limit: number;
}

/** Search attractions with visibility filtering — attractions that only appear on private
 *  trips the caller can't access are hidden from the results. userId is null for
 *  unauthenticated callers. */
export async function searchAttractions(
  userId: string | null,
  params: SearchAttractionsParams
): Promise<SearchAttractionsResult> {
  const { country, city, q, type, ownerId, parentAttractionId, includeHidden } = params;

  if (!country?.trim() && !city?.trim() && !type?.trim() && !parentAttractionId?.trim()) {
    throw badRequest("country, city, type, or parentAttractionId param is required");
  }

  await dbConnect();

  let hiddenIds: string[] = [];
  if (!includeHidden) {
    const privateFilter = userId
      ? { isPrivate: true, ownerId: { $ne: userId }, "collaborators.userId": { $ne: userId } }
      : { isPrivate: true };

    const accessibleFilter = userId
      ? { $or: [{ ownerId: userId }, { "collaborators.userId": userId }, { isPrivate: { $ne: true } }] }
      : { isPrivate: { $ne: true } };

    const [privateTrips, accessibleTrips] = await Promise.all([
      Trip.find(privateFilter).select("attractionIds").lean(),
      Trip.find(accessibleFilter).select("attractionIds").lean(),
    ]);

    const privateIds = new Set(privateTrips.flatMap((t) => (t.attractionIds ?? []).filter(Boolean).map((id) => id.toString())));
    const accessibleIds = new Set(accessibleTrips.flatMap((t) => (t.attractionIds ?? []).filter(Boolean).map((id) => id.toString())));
    hiddenIds = [...privateIds].filter((id) => !accessibleIds.has(id));
  }

  const filter: Record<string, unknown> = {};
  if (country?.trim()) filter.country = country.trim();
  if (city?.trim()) filter.city = city.trim();
  if (q?.trim()) filter.name = { $regex: q.trim(), $options: "i" };
  if (type?.trim()) {
    const typeDoc = await AttractionType.findOne({ name: type.trim() }).select("_id");
    if (!typeDoc) return { items: [], total: 0, skip: 0, limit: 0 };
    filter.types = typeDoc._id;
  }
  if (ownerId?.trim()) {
    filter.ownerId = ownerId.trim();
    filter.subtype = { $ne: "flight" };
  }
  if (parentAttractionId?.trim()) filter.parentAttractionId = parentAttractionId.trim();
  if (hiddenIds.length > 0) filter._id = { $nin: hiddenIds };

  // Page size defaults to (and is capped at) the pre-existing per-query-shape limit —
  // pagination narrows the page, it never returns more than the app already allowed.
  // A bare country query with no `q` is Explore's country-view map/grid listing, which
  // wants every attraction in one or two round trips, not a typeahead-sized trickle — a
  // country query WITH `q` is still the search-modal typeahead (AttractionSearchModal),
  // which keeps the low 20 cap on purpose.
  const cap = city?.trim() ? 100 : type?.trim() ? 200 : q?.trim() ? 20 : 300;
  const skip = Math.max(0, params.skip ?? 0);
  const limit = Math.min(Math.max(1, params.limit ?? cap), cap);

  // Ordered by city, then name — groups a country-wide list (e.g. Explore's grid view)
  // by destination instead of interleaving cities alphabetically by attraction name.
  // Final _id tiebreaker: city+name alone isn't guaranteed unique (e.g. a chain with
  // several same-named branches even within one city) — without a tiebreaker, MongoDB
  // doesn't guarantee a stable order among tied documents across separate skip/limit
  // calls, so paginating can return the same document on more than one page while
  // silently skipping another (found via a real 17-branch "Anni's Black Forest Secret"
  // repeating for many consecutive pages in the Explore grid).
  const [items, total] = await Promise.all([
    Attraction.find(filter).populate(["types", "foodStyles"]).sort({ city: 1, name: 1, _id: 1 }).skip(skip).limit(limit),
    Attraction.countDocuments(filter),
  ]);

  return { items, total, skip, limit };
}

/** Fetches one attraction by id — used for cross-navigation (e.g. opening a parent
 *  attraction's own detail view from a child's "Part of X" chip), where only the id/name
 *  is on hand and the full record is needed. No visibility filtering (unlike
 *  `searchAttractions`) — matches the existing PUT/DELETE handlers' access model,
 *  since this is public discovery data, not a private trip-planning detail. */
export async function getAttractionById(id: string): Promise<IAttraction> {
  await dbConnect();
  const attraction = await Attraction.findById(id).populate(["types", "foodStyles"]);
  if (!attraction) throw notFound("Attraction not found");
  return attraction;
}

export interface CreateAttractionInput {
  name?: string;
  country?: string;
  city?: string;
  coordinates?: { lat: number; lng: number } | null;
  /** Nests this attraction inside another (e.g. a restaurant inside a mall) — when set,
   *  `coordinates`/`city`/`country` are inherited from the parent and any client-sent
   *  values for those fields are ignored (silently overridden), not rejected — a child's
   *  location is defined by its parent, not by the caller. */
  parentAttractionId?: string | null;
  types?: string[];
  /** Only meaningful for dining-type attractions — admin-managed food style names. */
  foodStyles?: string[];
  durationValue?: string;
  durationUnit?: "minutes" | "hours";
  price?: number | null;
  /** Named price tiers — when provided, overrides `price` (the primary tier's amount is
   *  synced onto `price` for backward compat). Omit to create a single-tier attraction
   *  from `price` alone, unchanged from before this field existed. */
  prices?: { label: string; amount: number; isPrimary?: boolean }[];
  currency?: string;
  openingHours?: OpeningHours;
  openingMonths?: number[];
  notes?: string;
  photoUrl?: string;
  websiteUrl?: string;
}

export async function createAttraction(payload: JwtPayload, body: CreateAttractionInput): Promise<IAttraction> {
  const { name, country, city, coordinates, parentAttractionId, types, foodStyles, durationValue, durationUnit,
    price, prices: priceTiersInput, currency, openingHours, openingMonths, notes, photoUrl, websiteUrl } = body;

  if (!name?.trim() || (!parentAttractionId && (!country?.trim() || !city?.trim()))) {
    // A child's country/city are inherited from its parent — only required directly when
    // there's no parent to inherit them from.
    throw badRequest("name, country, and city are required");
  }

  await dbConnect();

  const existing = await Attraction.findOne(
    { name: name.trim() },
    undefined,
    { collation: { locale: "en", strength: 2 } }
  );
  if (existing) {
    throw conflict("An attraction with this name already exists");
  }

  const typeIds = types?.length
    ? (await AttractionType.find({ name: { $in: types } }).select("_id")).map((d) => d._id)
    : [];
  const foodStyleIds = foodStyles?.length
    ? (await FoodStyle.find({ name: { $in: foodStyles } }).select("_id")).map((d) => d._id)
    : [];

  // A child's coordinates/city/country are inherited from the parent, not client-supplied —
  // silently overridden rather than rejected, since the location is defined by the parent.
  const parent = parentAttractionId ? await resolveParentLink(parentAttractionId, country) : null;
  const resolvedCountry = parent?.country ?? country!.trim();
  const resolvedCity = parent?.city ?? city!.trim();
  const resolvedCoordinates = parent ? parent.coordinates ?? null : coordinates ?? null;
  const normalizedTiers = priceTiersInput?.length ? normalizePriceTiers(priceTiersInput) : null;

  try {
    const attraction = await Attraction.create({
      ownerId: payload.userId,
      name: name.trim(),
      country: resolvedCountry,
      city: resolvedCity,
      coordinates: resolvedCoordinates,
      parentAttractionId: parent?._id ?? null,
      types: typeIds,
      foodStyles: foodStyleIds,
      durationValue: durationValue || undefined,
      durationUnit: durationUnit || undefined,
      price: normalizedTiers ? normalizedTiers.primaryAmount : (price ?? null),
      prices: normalizedTiers?.prices,
      currency: currency || "USD",
      openingHours: openingHours ?? undefined,
      openingMonths: openingMonths?.length ? openingMonths : undefined,
      notes: notes || undefined,
      photoUrl: photoUrl || undefined,
      websiteUrl: websiteUrl || undefined,
    });

    await attraction.populate(["types", "foodStyles"]);
    return attraction;
  } catch (err) {
    throwIfDuplicateKeyError(err);
  }
}

/** Resolves a trip document for mutation — owner or collaborator both qualify. */
async function getAuthedTrip(payload: JwtPayload, tripId: string): Promise<ITrip> {
  await dbConnect();
  const trip = await Trip.findOne({
    _id: tripId,
    $or: [
      { ownerId: payload.userId },
      { "collaborators.userId": payload.userId },
    ],
  });
  if (!trip) throw notFound("Trip not found");
  return trip;
}

export type UpdateAttractionInput = Record<string, unknown>;

/** Update an attraction. Allowed if the requester owns the attraction OR is an owner/collaborator
 *  of a trip that contains it (attractions are shared objects — any trip member who added it
 *  should be able to edit its details, e.g. price). */
export async function updateAttraction(
  payload: JwtPayload,
  id: string,
  body: UpdateAttractionInput
): Promise<IAttraction> {
  await dbConnect();

  const attraction = await Attraction.findById(id);
  if (!attraction) {
    throw notFound("Attraction not found");
  }

  const isAttractionOwner = attraction.ownerId.toString() === payload.userId;
  if (!isAttractionOwner) {
    const hasTripAccess = await Trip.exists({
      attractionIds: id,
      $or: [{ ownerId: payload.userId }, { "collaborators.userId": payload.userId }],
    });
    if (!hasTripAccess) {
      throw notFound("Attraction not found");
    }
  }

  if (body.name && (body.name as string).trim().toLowerCase() !== attraction.name.toLowerCase()) {
    // A name match only conflicts when the coordinates match too — real-world places can
    // share a name at different locations (e.g. two "Central Park"s). Without coordinates
    // on either side, we can't confirm it's actually the same place, so no conflict.
    const nextCoordinates = body.coordinates !== undefined
      ? (body.coordinates as { lat: number; lng: number } | null)
      : attraction.coordinates ?? null;

    if (nextCoordinates?.lat != null && nextCoordinates?.lng != null) {
      const duplicate = await Attraction.findOne(
        {
          name: (body.name as string).trim(),
          _id: { $ne: attraction._id },
          "coordinates.lat": nextCoordinates.lat,
          "coordinates.lng": nextCoordinates.lng,
        },
        undefined,
        { collation: { locale: "en", strength: 2 } }
      );
      if (duplicate) {
        throw conflict("An attraction with this name already exists at this location");
      }
    }
  }

  // Nesting: setting a parent inherits its coordinates/city/country (overriding any
  // country/city/coordinates also present in this same request — a child's location is
  // defined by its parent, not independently). `null` explicitly clears the link; the
  // last-inherited coordinates/city/country are left in place (the place didn't physically
  // move just because its "part of X" link was removed) — `undefined` (key absent) leaves
  // the existing link untouched entirely.
  let parentJustSet: IAttraction | null = null;
  if (body.parentAttractionId !== undefined) {
    if (body.parentAttractionId === null) {
      attraction.parentAttractionId = null;
    } else {
      parentJustSet = await resolveParentLink(body.parentAttractionId as string, body.country as string | undefined, id);
      attraction.parentAttractionId = parentJustSet._id as IAttraction["parentAttractionId"];
      attraction.country = parentJustSet.country;
      attraction.city = parentJustSet.city;
      attraction.coordinates = parentJustSet.coordinates ?? null;
    }
  }

  // Core fields — country/city/coordinates only apply here when a parent wasn't just set
  // above (which already resolved and applied them from the parent).
  if (body.name) attraction.name = body.name as string;
  if (!parentJustSet) {
    if (body.country) attraction.country = body.country as string;
    if (body.city) attraction.city = body.city as string;
    if (body.coordinates !== undefined) attraction.coordinates = body.coordinates as { lat: number; lng: number } | null;
  }
  if (body.types) {
    const names = body.types as string[];
    const typeDocs = await AttractionType.find({ name: { $in: names } }).select("_id");
    attraction.types = typeDocs.map((d) => d._id) as unknown as IAttraction["types"];
  }
  if (body.foodStyles !== undefined) {
    const names = body.foodStyles as string[];
    const foodStyleDocs = names.length
      ? await FoodStyle.find({ name: { $in: names } }).select("_id")
      : [];
    attraction.foodStyles = foodStyleDocs.map((d) => d._id) as unknown as IAttraction["foodStyles"];
  }
  if (body.durationValue !== undefined) attraction.durationValue = body.durationValue as string;
  if (body.durationUnit !== undefined) attraction.durationUnit = body.durationUnit as "minutes" | "hours";
  if (body.prices !== undefined) {
    const tiers = body.prices as { label: string; amount: number; isPrimary?: boolean }[];
    if (tiers.length === 0) {
      attraction.prices = undefined;
      if (body.price === undefined) throw badRequest("At least one price tier is required, or send `price` to fall back to a single rate");
    } else {
      const normalized = normalizePriceTiers(tiers);
      attraction.prices = normalized.prices;
      attraction.price = normalized.primaryAmount;
    }
  }
  // Only applied when `prices` wasn't also sent in this same request — `prices` (above)
  // already resolves and syncs the correct `price` from the new primary tier.
  if (body.price !== undefined && body.prices === undefined) attraction.price = body.price as number | null;
  if (body.currency !== undefined) attraction.currency = body.currency as string;
  if (body.openingHours !== undefined) {
    attraction.openingHours = body.openingHours as OpeningHours;
  }
  if (body.openingMonths !== undefined) {
    attraction.openingMonths = body.openingMonths as number[];
  }
  if (body.notes !== undefined) attraction.notes = body.notes as string;
  if (body.photoUrl !== undefined) attraction.photoUrl = body.photoUrl as string;
  if (body.websiteUrl !== undefined) attraction.websiteUrl = body.websiteUrl as string;

  // NOTE: plannedDate, plannedTime, actualDuration* are now trip-specific schedule fields
  // and live in Trip.schedules — they are NOT updated here.
  // Use PATCH /api/trips/:id/attractions/:attractionId for scheduling.

  // Subtype fields
  if (body.subtype !== undefined) attraction.subtype = body.subtype as "residence" | "flight";
  if (body.residenceType !== undefined) attraction.residenceType = body.residenceType as string;
  if (body.checkInDate !== undefined) attraction.checkInDate = body.checkInDate as string;
  if (body.checkOutDate !== undefined) attraction.checkOutDate = body.checkOutDate as string;
  if (body.flightNumber !== undefined) attraction.flightNumber = body.flightNumber as string;
  if (body.airline !== undefined) attraction.airline = body.airline as string;
  if (body.departureAirport !== undefined) attraction.departureAirport = body.departureAirport as string;
  if (body.arrivalAirport !== undefined) attraction.arrivalAirport = body.arrivalAirport as string;
  if (body.departureTime !== undefined) attraction.departureTime = body.departureTime as string;
  if (body.arrivalTime !== undefined) attraction.arrivalTime = body.arrivalTime as string;
  if (body.gate !== undefined) attraction.gate = body.gate as string;
  if (body.seat !== undefined) attraction.seat = body.seat as string;

  try {
    await attraction.save();
  } catch (err) {
    throwIfDuplicateKeyError(err);
  }
  await attraction.populate(["types", "foodStyles"]);
  return attraction;
}

/** Hard-delete the global attraction document. Owner-only. To unlink from a single trip
 *  without deleting, use removeAttractionFromTrip instead. */
export async function deleteAttraction(payload: JwtPayload, id: string): Promise<void> {
  await dbConnect();

  const attraction = await Attraction.findOne({ _id: id, ownerId: payload.userId });
  if (!attraction) {
    throw notFound("Attraction not found");
  }

  // Block rather than silently orphan children's parentAttractionId — matches how
  // destructive actions are generally guarded elsewhere in this app.
  const childCount = await getChildCount(id);
  if (childCount > 0) {
    throw conflict(`Cannot delete — ${childCount} attraction${childCount === 1 ? "" : "s"} still nested inside this one. Remove or reassign them first.`);
  }

  await attraction.deleteOne();
}

export interface ListTripAttractionsParams {
  type?: string | null;
  sort?: string | null;
}

/** Lists attractions for a trip, merging Attraction docs with per-trip schedule overrides,
 *  plus synthesizing custom-slot/flight entries that have no Attraction document. userId is
 *  null for unauthenticated callers (non-private trips are readable without a token). Returns
 *  an empty array (not a 404) when the trip doesn't exist or isn't visible to the caller —
 *  matches the original route's behavior. */
export async function listTripAttractions(
  userId: string | null,
  tripId: string,
  params: ListTripAttractionsParams
): Promise<AttractionShape[]> {
  await dbConnect();

  const tripQuery = userId
    ? {
        _id: tripId,
        $or: [
          { ownerId: userId },
          { "collaborators.userId": userId },
          { isPrivate: { $ne: true } },
        ],
      }
    : { _id: tripId, isPrivate: { $ne: true } };

  const trip = await Trip.findOne(tripQuery);
  if (!trip) return [];

  const { type: typeFilter, sort } = params;

  const query: Record<string, unknown> = { _id: { $in: trip.attractionIds } };
  if (typeFilter) {
    const typeDoc = await AttractionType.findOne({ name: typeFilter }).select("_id");
    if (!typeDoc) return [];
    query.types = typeDoc._id;
  }

  const docs = await Attraction.find(query)
    .populate(["types", "foodStyles"])
    .sort(sort === "price" ? { price: 1 } : undefined)
    .exec();
  const docsById = new Map(docs.map((doc) => [doc._id.toString(), doc]));
  const visitedIds = await getVisitedIdSet(userId);
  const usedInTripsMap = await getUsedInTripsMap(userId);
  const parentNameMap = await getParentNameMap(docs.map((doc) => doc.parentAttractionId?.toString()));
  const childCountMap = await getChildCountMap(docs.map((doc) => doc._id.toString()));

  // Group regular-attraction schedule entries by which real document they reference — a
  // real attraction can have multiple instances (see IScheduleEntry.attractionRef), each
  // with its own plannedDate/plannedTime. The legacy/primary instance's schedule key IS the
  // attraction's own id (attractionRef absent); an additional instance's key is a fresh
  // synthetic id with attractionRef pointing back to the real document.
  const entriesByDocId = new Map<string, Array<[string, IScheduleEntry]>>();
  for (const [key, entry] of trip.schedules?.entries() ?? []) {
    if (entry?.isCustomSlot || entry?.isFlight) continue; // handled separately below
    const realId = entry?.attractionRef ?? (docsById.has(key) ? key : null);
    if (!realId || !docsById.has(realId)) continue; // stale key / doc no longer linked
    const list = entriesByDocId.get(realId) ?? [];
    list.push([key, entry]);
    entriesByDocId.set(realId, list);
  }

  // One row per instance, grouped under each doc in the query's existing sort order
  // (name/price) so overall ordering is unchanged from before this feature existed.
  const result: AttractionShape[] = [];
  for (const doc of docs) {
    const idStr = doc._id.toString();
    const entries = entriesByDocId.get(idStr);
    const isVisited = visitedIds.has(idStr);
    const usedInTripNames = usedInTripsMap.get(idStr);
    const parentAttractionName = doc.parentAttractionId ? parentNameMap.get(doc.parentAttractionId.toString()) : undefined;
    const childAttractionCount = childCountMap.get(idStr) ?? 0;
    if (!entries || entries.length === 0) {
      result.push(formatAttraction(doc, null, idStr, isVisited, usedInTripNames, parentAttractionName, childAttractionCount)); // linked but not yet scheduled
    } else {
      for (const [key, entry] of entries) {
        result.push(formatAttraction(doc, entry, key, isVisited, usedInTripNames, parentAttractionName, childAttractionCount));
      }
    }
  }

  // Append custom time-slots and flights (schedule-only entries — no Attraction document).
  // toObject({ flattenMaps: true }) bypasses Mongoose strict mode and returns raw
  // MongoDB data including fields not declared in the sub-schema (isCustomSlot, name, etc.).
  type RawEntry = {
    isCustomSlot?: boolean; name?: string; typeNames?: string[];
    price?: number | null; currency?: string; notes?: string;
    plannedDate?: string | null; plannedTime?: string | null;
    actualDurationValue?: string; actualDurationUnit?: "minutes" | "hours";
    isFlight?: boolean; flightNumber?: string; airline?: string;
    departureAirport?: string; arrivalAirport?: string;
    departureTime?: string; arrivalTime?: string; gate?: string; seat?: string;
  };
  const rawTrip = trip.toObject({ flattenMaps: true }) as unknown as {
    schedules?: Record<string, RawEntry>;
  };
  const scheduleOnlyEntries: AttractionShape[] = [];
  for (const [key, entry] of Object.entries(rawTrip.schedules ?? {})) {
    if (entry?.isCustomSlot) {
      scheduleOnlyEntries.push({
        _id: key,
        ownerId: userId ?? "",
        name: entry.name ?? "",
        country: "",
        city: "",
        coordinates: null,
        types: entry.typeNames ?? [],
        price: entry.price ?? null,
        currency: entry.currency ?? "USD",
        notes: entry.notes,
        subtype: "custom-slot",
        plannedDate: entry.plannedDate ?? null,
        plannedTime: entry.plannedTime ?? null,
        actualDurationValue: entry.actualDurationValue,
        actualDurationUnit: entry.actualDurationUnit,
      });
    } else if (entry?.isFlight) {
      scheduleOnlyEntries.push({
        _id: key,
        ownerId: userId ?? "",
        name: entry.name ?? "",
        country: "",
        city: "",
        coordinates: null,
        types: ["Flight"],
        price: entry.price ?? null,
        currency: entry.currency ?? "USD",
        notes: entry.notes,
        subtype: "flight",
        flightNumber: entry.flightNumber,
        airline: entry.airline,
        departureAirport: entry.departureAirport,
        arrivalAirport: entry.arrivalAirport,
        departureTime: entry.departureTime,
        arrivalTime: entry.arrivalTime,
        gate: entry.gate,
        seat: entry.seat,
        plannedDate: entry.plannedDate ?? null,
        plannedTime: entry.plannedTime ?? null,
        actualDurationValue: entry.actualDurationValue,
        actualDurationUnit: entry.actualDurationUnit,
      });
    }
  }

  return [...result, ...scheduleOnlyEntries];
}

export interface AddAttractionToTripInput {
  existingAttractionId?: string;
  /** When true and this attraction is already linked to the trip, create an additional
   *  scheduled instance (synthetic key + attractionRef) instead of returning the existing
   *  single instance unchanged. See IScheduleEntry.attractionRef. */
  allowDuplicate?: boolean;
  name?: string;
  country?: string;
  city?: string;
  coordinates?: { lat: number; lng: number } | null;
  types?: string[];
  durationValue?: string;
  durationUnit?: "minutes" | "hours";
  price?: number | null;
  currency?: string;
  openingHours?: OpeningHours;
  openingMonths?: number[];
  notes?: string;
  photoUrl?: string;
  websiteUrl?: string;
  subtype?: "residence" | "flight" | "custom-slot";
  residenceType?: string;
  checkInDate?: string;
  checkOutDate?: string;
  flightNumber?: string;
  airline?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureTime?: string;
  arrivalTime?: string;
  gate?: string;
  seat?: string;
  plannedDate?: string | null;
  plannedTime?: string | null;
  actualDurationValue?: string;
  actualDurationUnit?: "minutes" | "hours";
}

export interface AddAttractionToTripResult {
  data: AttractionShape;
  status: number;
}

/** Adds an attraction to a trip's itinerary. Three branches: custom-slot, flight (both
 *  schedule-only entries with no backing Attraction document), and existing/new attraction
 *  (with residence-specific schedule override handling). */
export async function addAttractionToTrip(
  payload: JwtPayload,
  tripId: string,
  body: AddAttractionToTripInput
): Promise<AddAttractionToTripResult> {
  const trip = await getAuthedTrip(payload, tripId);

  const { existingAttractionId, allowDuplicate, name, country, city, coordinates, types, durationValue, durationUnit,
    price, currency, openingHours, openingMonths, notes, photoUrl, websiteUrl,
    subtype, residenceType, checkInDate, checkOutDate,
    flightNumber, airline, departureAirport, arrivalAirport, departureTime, arrivalTime, gate, seat,
    plannedDate, plannedTime, actualDurationValue, actualDurationUnit } = body;

  let attraction: IAttraction;

  if (subtype === "custom-slot") {
    if (!name?.trim()) {
      throw badRequest("name is required");
    }
    const customSlotId = `cs-${new Types.ObjectId().toString()}`;
    // Use findByIdAndUpdate + $set to bypass Mongoose strict mode — trip.schedules.set()
    // + trip.save() would strip any fields not in the cached sub-schema.
    await Trip.findByIdAndUpdate(tripId, {
      $set: {
        [`schedules.${customSlotId}`]: {
          plannedDate: plannedDate ?? null,
          plannedTime: plannedTime ?? null,
          actualDurationValue: actualDurationValue || undefined,
          actualDurationUnit: actualDurationUnit || undefined,
          isCustomSlot: true,
          name: name.trim(),
          typeNames: types ?? [],
          price: price ?? null,
          currency: currency || "USD",
          notes: notes || undefined,
        },
      },
    });

    return {
      status: 201,
      data: {
        _id: customSlotId,
        ownerId: payload.userId,
        name: name.trim(),
        country: "",
        city: "",
        coordinates: null,
        types: types ?? [],
        price: price ?? null,
        currency: currency || "USD",
        notes: notes || undefined,
        subtype: "custom-slot",
        plannedDate: plannedDate ?? null,
        plannedTime: plannedTime ?? null,
        actualDurationValue: actualDurationValue || undefined,
        actualDurationUnit: actualDurationUnit || undefined,
      } satisfies AttractionShape,
    };
  } else if (subtype === "flight") {
    if (!name?.trim()) {
      throw badRequest("name is required");
    }
    const flightId = `fl-${new Types.ObjectId().toString()}`;
    // Flights are trip-scoped only — never create a global Attraction document, so
    // flights can never collide (by name) across trips or be picked from another
    // trip's existing-attractions list. Mirrors the custom-slot pattern above.
    await Trip.findByIdAndUpdate(tripId, {
      $set: {
        [`schedules.${flightId}`]: {
          plannedDate: plannedDate ?? null,
          plannedTime: plannedTime ?? null,
          actualDurationValue: actualDurationValue || undefined,
          actualDurationUnit: actualDurationUnit || undefined,
          isFlight: true,
          name: name.trim(),
          price: price ?? null,
          currency: currency || "USD",
          notes: notes || undefined,
          flightNumber: flightNumber || undefined,
          airline: airline || undefined,
          departureAirport: departureAirport || undefined,
          arrivalAirport: arrivalAirport || undefined,
          departureTime: departureTime || undefined,
          arrivalTime: arrivalTime || undefined,
          gate: gate || undefined,
          seat: seat || undefined,
        },
      },
    });

    return {
      status: 201,
      data: {
        _id: flightId,
        ownerId: payload.userId,
        name: name.trim(),
        country: "",
        city: "",
        coordinates: null,
        types: ["Flight"],
        price: price ?? null,
        currency: currency || "USD",
        notes: notes || undefined,
        subtype: "flight",
        flightNumber,
        airline,
        departureAirport,
        arrivalAirport,
        departureTime,
        arrivalTime,
        gate,
        seat,
        plannedDate: plannedDate ?? null,
        plannedTime: plannedTime ?? null,
        actualDurationValue: actualDurationValue || undefined,
        actualDurationUnit: actualDurationUnit || undefined,
      } satisfies AttractionShape,
    };
  } else if (existingAttractionId) {
    const found = await Attraction.findById(existingAttractionId);
    if (!found) {
      throw notFound("Attraction not found");
    }
    attraction = found;
  } else {
    if (!name?.trim() || !country?.trim() || !city?.trim()) {
      throw badRequest("name, country, and city are required");
    }

    const found = await Attraction.findOne(
      { name: name.trim(), country: country.trim() },
      undefined,
      { collation: { locale: "en", strength: 2 } }
    );

    if (found) {
      attraction = found;
    } else {
      const typeIds = types?.length
        ? (await AttractionType.find({ name: { $in: types } }).select("_id")).map((d) => d._id)
        : [];

      // Residences only carry reusable, place-level data on the shared document (name,
      // location, residenceType) — a stay's dates/price/notes are specific to THIS trip's
      // booking, so they're written only to this trip's schedule entry below, never here.
      const isResidence = subtype === "residence";
      try {
        attraction = await Attraction.create({
          ownerId: payload.userId,
          name: name.trim(),
          country: country.trim(),
          city: city.trim(),
          coordinates: coordinates ?? null,
          types: typeIds,
          durationValue: durationValue || undefined,
          durationUnit: durationUnit || undefined,
          price: isResidence ? null : (price ?? null),
          currency: currency || "USD",
          openingHours: openingHours ?? undefined,
          openingMonths: openingMonths?.length ? openingMonths : undefined,
          notes: isResidence ? undefined : (notes || undefined),
          photoUrl: photoUrl || undefined,
          websiteUrl: websiteUrl || undefined,
          subtype: subtype || undefined,
          residenceType: residenceType || undefined,
        });
      } catch (err) {
        throwIfDuplicateKeyError(err);
      }
    }
  }

  const attractionId = attraction._id.toString();
  const isVisited = await isAttractionVisited(payload.userId, attractionId);
  const parentAttractionName = await getParentName(attraction.parentAttractionId?.toString());
  const childAttractionCount = await getChildCount(attractionId);

  const alreadyLinked = trip.attractionIds.some(
    (id) => id.toString() === attractionId
  );
  if (alreadyLinked) {
    if (allowDuplicate) {
      const instanceKey = `at-${new Types.ObjectId().toString()}`;
      const scheduleEntry: IScheduleEntry = {
        plannedDate: plannedDate ?? null,
        plannedTime: plannedTime ?? null,
        actualDurationValue: actualDurationValue || undefined,
        actualDurationUnit: actualDurationUnit || undefined,
        attractionRef: attractionId,
        ...(subtype === "residence" ? {
          checkInDate: checkInDate || undefined,
          checkOutDate: checkOutDate || undefined,
          price: price ?? undefined,
          currency: currency || undefined,
          notes: notes || undefined,
        } : {}),
      };
      // Use findByIdAndUpdate + $set, not trip.save() — trip.schedules is a Map-typed
      // field and .save() can silently no-op on Map mutations (see docs/LEARNINGS.md).
      await Trip.findByIdAndUpdate(tripId, {
        $set: { [`schedules.${instanceKey}`]: scheduleEntry },
      });
      await attraction.populate(["types", "foodStyles"]);
      const usedInTripNames = await getUsedInTripNames(payload.userId, attractionId);
      return { status: 201, data: formatAttraction(attraction, scheduleEntry, instanceKey, isVisited, usedInTripNames, parentAttractionName, childAttractionCount) };
    }
    const schedule = trip.schedules?.get(attractionId);
    await attraction.populate(["types", "foodStyles"]);
    const usedInTripNames = await getUsedInTripNames(payload.userId, attractionId);
    return { status: 200, data: formatAttraction(attraction, schedule ?? null, undefined, isVisited, usedInTripNames, parentAttractionName, childAttractionCount) };
  }

  trip.attractionIds.push(attraction._id);

  const scheduleEntry: IScheduleEntry = {
    plannedDate: plannedDate ?? null,
    plannedTime: plannedTime ?? null,
    actualDurationValue: actualDurationValue || undefined,
    actualDurationUnit: actualDurationUnit || undefined,
    // A residence's stay dates/price/notes are specific to THIS trip's booking — they
    // must never be written onto the shared Attraction document, which other trips may
    // also reference (or come to reference later). Store them on the schedule entry
    // instead; formatAttraction prefers this override over the document's value. Applies
    // whether this is a brand-new residence or an existing one picked from another trip.
    ...(subtype === "residence" ? {
      checkInDate: checkInDate || undefined,
      checkOutDate: checkOutDate || undefined,
      price: price ?? undefined,
      currency: currency || undefined,
      notes: notes || undefined,
    } : {}),
  };
  if (!trip.schedules) trip.set("schedules", new Map());
  trip.schedules.set(attractionId, scheduleEntry);

  await trip.save();
  await attraction.populate(["types", "foodStyles"]);

  const usedInTripNames = await getUsedInTripNames(payload.userId, attractionId);
  return { status: 201, data: formatAttraction(attraction, scheduleEntry, undefined, isVisited, usedInTripNames, parentAttractionName, childAttractionCount) };
}

export interface UpdateTripAttractionScheduleInput {
  plannedDate?: string | null;
  plannedTime?: string | null;
  actualDurationValue?: string;
  actualDurationUnit?: "minutes" | "hours";
  // Per-trip override fields, valid for any attraction (formatAttraction always
  // prefers the schedule value over the shared document's) — used e.g. by residences,
  // whose stay dates/price/notes are specific to this trip's booking.
  price?: number | null;
  currency?: string;
  /** How many of each of the linked attraction's `prices` tiers (by label) are selected
   *  for the trip Costs tab total. Per-trip — see `IScheduleEntry.priceTierQuantities`. */
  priceTierQuantities?: { label: string; quantity: number }[];
  notes?: string;
  checkInDate?: string;
  checkOutDate?: string;
  // Custom time-slot fields (only when attractionId starts with "cs-")
  name?: string;
  typeNames?: string[];
  // Flight fields (only when attractionId starts with "fl-")
  flightNumber?: string;
  airline?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureTime?: string;
  arrivalTime?: string;
  gate?: string;
  seat?: string;
}

/** Update trip-specific schedule for one attraction (or all fields for a custom time-slot /
 *  flight, which live only in the schedule map). */
export async function updateTripAttractionSchedule(
  payload: JwtPayload,
  tripId: string,
  attractionId: string,
  body: UpdateTripAttractionScheduleInput
): Promise<AttractionShape> {
  await dbConnect();

  // Verify access without loading the full document
  const accessible = await Trip.exists({
    _id: tripId,
    $or: [
      { ownerId: payload.userId },
      { "collaborators.userId": payload.userId },
    ],
  });
  if (!accessible) throw notFound("Trip not found");

  const isCustomSlot = attractionId.startsWith("cs-");
  const isFlight = attractionId.startsWith("fl-");

  // Build a $set using deep dot-notation paths so MongoDB patches fields in-place.
  const scheduleSet: Record<string, unknown> = {};
  const p = `schedules.${attractionId}`;
  if (body.plannedDate !== undefined) scheduleSet[`${p}.plannedDate`] = body.plannedDate;
  if (body.plannedTime !== undefined) scheduleSet[`${p}.plannedTime`] = body.plannedTime;
  if (body.actualDurationValue !== undefined) scheduleSet[`${p}.actualDurationValue`] = body.actualDurationValue;
  if (body.actualDurationUnit !== undefined) scheduleSet[`${p}.actualDurationUnit`] = body.actualDurationUnit;
  if (body.price !== undefined) scheduleSet[`${p}.price`] = body.price;
  if (body.currency !== undefined) scheduleSet[`${p}.currency`] = body.currency;
  if (body.priceTierQuantities !== undefined) scheduleSet[`${p}.priceTierQuantities`] = body.priceTierQuantities;
  if (body.notes !== undefined) scheduleSet[`${p}.notes`] = body.notes;
  if (body.checkInDate !== undefined) scheduleSet[`${p}.checkInDate`] = body.checkInDate;
  if (body.checkOutDate !== undefined) scheduleSet[`${p}.checkOutDate`] = body.checkOutDate;

  if (isCustomSlot) {
    if (body.name !== undefined) scheduleSet[`${p}.name`] = body.name;
    if (body.typeNames !== undefined) scheduleSet[`${p}.typeNames`] = body.typeNames;
  }

  if (isFlight) {
    if (body.name !== undefined) scheduleSet[`${p}.name`] = body.name;
    if (body.flightNumber !== undefined) scheduleSet[`${p}.flightNumber`] = body.flightNumber;
    if (body.airline !== undefined) scheduleSet[`${p}.airline`] = body.airline;
    if (body.departureAirport !== undefined) scheduleSet[`${p}.departureAirport`] = body.departureAirport;
    if (body.arrivalAirport !== undefined) scheduleSet[`${p}.arrivalAirport`] = body.arrivalAirport;
    if (body.departureTime !== undefined) scheduleSet[`${p}.departureTime`] = body.departureTime;
    if (body.arrivalTime !== undefined) scheduleSet[`${p}.arrivalTime`] = body.arrivalTime;
    if (body.gate !== undefined) scheduleSet[`${p}.gate`] = body.gate;
    if (body.seat !== undefined) scheduleSet[`${p}.seat`] = body.seat;
  }

  const updatedTrip = await Trip.findByIdAndUpdate(
    tripId,
    { $set: scheduleSet },
    { new: true }
  );

  if (isCustomSlot) {
    // Use toObject({ flattenMaps: true }) to bypass Mongoose strict mode — schedules.get()
    // returns a sub-document that strips fields absent from the cached sub-schema.
    type RawEntry = {
      isCustomSlot?: boolean; name?: string; typeNames?: string[];
      price?: number | null; currency?: string; notes?: string;
      plannedDate?: string | null; plannedTime?: string | null;
      actualDurationValue?: string; actualDurationUnit?: "minutes" | "hours";
    };
    const rawTrip = updatedTrip?.toObject({ flattenMaps: true }) as unknown as {
      schedules?: Record<string, RawEntry>;
    } | null;
    const entry = rawTrip?.schedules?.[attractionId];
    if (!entry) throw notFound("Custom slot not found");
    return {
      _id: attractionId,
      ownerId: payload.userId,
      name: entry.name ?? "",
      country: "",
      city: "",
      coordinates: null,
      types: entry.typeNames ?? [],
      price: entry.price ?? null,
      currency: entry.currency ?? "USD",
      notes: entry.notes,
      subtype: "custom-slot",
      plannedDate: entry.plannedDate ?? null,
      plannedTime: entry.plannedTime ?? null,
      actualDurationValue: entry.actualDurationValue,
      actualDurationUnit: entry.actualDurationUnit,
    } satisfies AttractionShape;
  }

  if (isFlight) {
    // Same technique as the custom-slot branch above — bypass Mongoose strict mode
    // to read back fields not declared in the cached sub-schema.
    type RawFlightEntry = {
      isFlight?: boolean; name?: string;
      price?: number | null; currency?: string; notes?: string;
      plannedDate?: string | null; plannedTime?: string | null;
      actualDurationValue?: string; actualDurationUnit?: "minutes" | "hours";
      flightNumber?: string; airline?: string;
      departureAirport?: string; arrivalAirport?: string;
      departureTime?: string; arrivalTime?: string; gate?: string; seat?: string;
    };
    const rawTrip = updatedTrip?.toObject({ flattenMaps: true }) as unknown as {
      schedules?: Record<string, RawFlightEntry>;
    } | null;
    const entry = rawTrip?.schedules?.[attractionId];
    if (!entry) throw notFound("Flight not found");
    return {
      _id: attractionId,
      ownerId: payload.userId,
      name: entry.name ?? "",
      country: "",
      city: "",
      coordinates: null,
      types: ["Flight"],
      price: entry.price ?? null,
      currency: entry.currency ?? "USD",
      notes: entry.notes,
      subtype: "flight",
      flightNumber: entry.flightNumber,
      airline: entry.airline,
      departureAirport: entry.departureAirport,
      arrivalAirport: entry.arrivalAirport,
      departureTime: entry.departureTime,
      arrivalTime: entry.arrivalTime,
      gate: entry.gate,
      seat: entry.seat,
      plannedDate: entry.plannedDate ?? null,
      plannedTime: entry.plannedTime ?? null,
      actualDurationValue: entry.actualDurationValue,
      actualDurationUnit: entry.actualDurationUnit,
    } satisfies AttractionShape;
  }

  const updatedSchedule = updatedTrip?.schedules?.get(attractionId) ?? null;
  // A 2nd+ scheduled instance's key is synthetic (not a real Attraction id) — attractionRef
  // points back to the shared document. The primary instance's key IS the real id.
  const realAttractionId = updatedSchedule?.attractionRef ?? attractionId;
  const attraction = await Attraction.findById(realAttractionId);
  if (!attraction) throw notFound("Attraction not found");
  const isVisited = await isAttractionVisited(payload.userId, realAttractionId);
  const usedInTripNames = await getUsedInTripNames(payload.userId, realAttractionId);
  const parentAttractionName = await getParentName(attraction.parentAttractionId?.toString());
  const childAttractionCount = await getChildCount(realAttractionId);

  return formatAttraction(attraction, updatedSchedule, attractionId, isVisited, usedInTripNames, parentAttractionName, childAttractionCount);
}

/** Unlink attraction from this trip (or remove a custom time-slot / flight entirely).
 *  Regular Attraction documents are NOT deleted from the DB — they remain global entities. */
export async function removeAttractionFromTrip(
  payload: JwtPayload,
  tripId: string,
  attractionId: string
): Promise<void> {
  await dbConnect();

  const trip = await Trip.findOne({
    _id: tripId,
    $or: [
      { ownerId: payload.userId },
      { "collaborators.userId": payload.userId },
    ],
  });
  if (!trip) throw notFound("Trip not found");

  if (attractionId.startsWith("cs-") || attractionId.startsWith("fl-")) {
    // Custom time-slot / flight: exists only in schedules — no attractionIds entry to remove
    if (trip.schedules?.has(attractionId)) {
      trip.schedules.delete(attractionId);
      await trip.save();
    }
    return;
  }

  // A 2nd+ scheduled instance's key is synthetic and attractionRef holds the shared
  // document's real id; the primary instance's key IS that real id (attractionRef absent).
  const entry = trip.schedules?.get(attractionId);
  const realAttractionId = entry?.attractionRef ?? attractionId;

  if (trip.schedules?.has(attractionId)) {
    trip.schedules.delete(attractionId);
    await trip.save();
  }

  // Only unlink the shared document from the trip if no other instance (primary key or
  // another attractionRef pointing at it) still references it — removing one instance
  // must not break siblings scheduled from the same attraction.
  const stillReferenced = [...(trip.schedules?.entries() ?? [])].some(
    ([key, e]) => key === realAttractionId || e?.attractionRef === realAttractionId
  );
  if (!stillReferenced) {
    await Trip.findByIdAndUpdate(tripId, { $pull: { attractionIds: realAttractionId } });
  }
}
