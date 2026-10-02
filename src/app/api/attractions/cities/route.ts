import { NextResponse } from "next/server";
import { Types, type PipelineStage } from "mongoose";
import { dbConnect } from "@/lib/mongoose";
import { Attraction } from "@/models/Attraction";
import { AttractionCategory } from "@/models/AttractionCategory";
import { AttractionType } from "@/models/AttractionType";
import { FoodStyle } from "@/models/FoodStyle";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { getUserFromRequest } from "@/lib/auth";
import { getVisitedIdSet } from "@/lib/services/visited.service";
import { getUsedInTripIdSet } from "@/lib/services/usedInTrips.service";

export const OPTIONS = corsPreflight;

export const GET = withApiHandler("GET /api/attractions/cities", async (req: Request) => {
  // Optional auth — used to compute per-city visitedCount/unvisitedCount and
  // usedInTripCount/notUsedInTripCount for the requesting user, same optional pattern
  // as GET /api/attractions.
  let userId: string | null = null;
  try { userId = getUserFromRequest(req).userId; } catch { /* unauthenticated */ }

  await dbConnect();

  // Optional category/type/foodStyle filters — let the Explore world view (no country
  // picked yet) narrow which countries/cities are shown, same as the existing visited/
  // usedInTrip/verified filters already do via the buckets below. Category has no direct
  // field on Attraction (only `types`), so it's resolved here: category name(s) ->
  // AttractionCategory ids -> AttractionType ids under those categories -> $match on
  // Attraction.types. Type and foodStyle each resolve directly by name (both are globally
  // unique). All given filters AND together, matching the existing client-side
  // matchesChipFilters/passFoodStyle semantics used once a country is picked.
  const { searchParams } = new URL(req.url);
  const categoryParam = searchParams.get("category");
  const categoryNames = categoryParam
    ? categoryParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const typeParam = searchParams.get("type");
  const typeNames = typeParam
    ? typeParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  let categoryTypeIds: Types.ObjectId[] = [];
  if (categoryNames.length > 0) {
    const categoryIds = await AttractionCategory.find({ name: { $in: categoryNames } }).distinct("_id");
    categoryTypeIds = await AttractionType.find({ categoryId: { $in: categoryIds } }).distinct("_id");
  }
  let selectedTypeIds: Types.ObjectId[] = [];
  if (typeNames.length > 0) {
    selectedTypeIds = await AttractionType.find({ name: { $in: typeNames } }).distinct("_id");
  }
  const foodStyleParam = searchParams.get("foodStyle");
  const foodStyleNames = foodStyleParam
    ? foodStyleParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  let foodStyleIds: Types.ObjectId[] = [];
  if (foodStyleNames.length > 0) {
    foodStyleIds = await FoodStyle.find({ name: { $in: foodStyleNames } }).distinct("_id");
  }

  const [visitedIds, usedInTripIds] = await Promise.all([
    getVisitedIdSet(userId),
    getUsedInTripIdSet(userId),
  ]);
  const visitedObjectIds = [...visitedIds].map((id) => new Types.ObjectId(id));
  const usedInTripObjectIds = [...usedInTripIds].map((id) => new Types.ObjectId(id));

  const pipeline: PipelineStage[] = [
    // Some nested children (mainly bulk-seeded ones) were never given their own
    // `coordinates` even though the live create/edit API always copies them from the
    // parent — rather than excluding those children from the map/counts entirely, fall
    // back to the parent's coordinates at read time via this self-join. Own coordinates
    // win when present; this never touches the stored documents.
    {
      $lookup: {
        from: "attractions",
        localField: "parentAttractionId",
        foreignField: "_id",
        pipeline: [{ $project: { coordinates: 1 } }],
        as: "_parent",
      },
    },
    {
      $addFields: {
        effectiveCoordinates: {
          $ifNull: ["$coordinates", { $arrayElemAt: ["$_parent.coordinates", 0] }],
        },
      },
    },
    {
      $match: {
        "effectiveCoordinates.lat": { $exists: true, $ne: null },
        "effectiveCoordinates.lng": { $exists: true, $ne: null },
      },
    },
  ];

  if (categoryTypeIds.length > 0) {
    pipeline.push({ $match: { types: { $in: categoryTypeIds } } });
  } else if (categoryNames.length > 0) {
    // Category name(s) given but resolved to zero types (typo/unknown category) — match
    // nothing, not everything, so the filter behaves predictably rather than silently
    // falling back to unfiltered results.
    pipeline.push({ $match: { _id: null } });
  }
  if (selectedTypeIds.length > 0) {
    pipeline.push({ $match: { types: { $in: selectedTypeIds } } });
  } else if (typeNames.length > 0) {
    pipeline.push({ $match: { _id: null } });
  }
  if (foodStyleIds.length > 0) {
    pipeline.push({ $match: { foodStyles: { $in: foodStyleIds } } });
  } else if (foodStyleNames.length > 0) {
    pipeline.push({ $match: { _id: null } });
  }

  pipeline.push(
    {
      $addFields: {
        isVisited: { $in: ["$_id", visitedObjectIds] },
        isUsedInTrip: { $in: ["$_id", usedInTripObjectIds] },
      },
    },
    {
      $group: {
        _id: { city: "$city", country: "$country" },
        // A city's attractions share the same region in practice (region is assigned
        // per-city by the migration/editor, not per-attraction) — $first is enough to
        // surface it without an extra grouping dimension.
        region: { $first: "$region" },
        lat:   { $avg: "$effectiveCoordinates.lat" },
        lng:   { $avg: "$effectiveCoordinates.lng" },
        count: { $sum: 1 },
        // Exact-intersection matrix across all three boolean filter dimensions
        // (visited × usedInTrip × verified), keyed "vuf" (each 1/0) — a single-dimension
        // count (e.g. "N visited") only says "at least one attraction matches X", which
        // can't answer "does at least one attraction match X AND Y AND Z" once 2+ filters
        // are active at once. The client sums the matching bucket(s) for whichever
        // combination of filters is currently selected, giving an exact count/visibility
        // check instead of an approximation.
        buckets: {
          $push: {
            k: {
              $concat: [
                { $cond: ["$isVisited", "1", "0"] },
                { $cond: ["$isUsedInTrip", "1", "0"] },
                { $cond: ["$verified", "1", "0"] },
              ],
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        name:    "$_id.city",
        country: "$_id.country",
        region: 1,
        lat: 1,
        lng: 1,
        count: 1,
        buckets: "$buckets.k",
      },
    },
    { $sort: { count: -1 } },
  );

  const result = await Attraction.aggregate(pipeline);

  // Collapse each city's flat bucket-key array (one entry per attraction) into counts
  // per key, e.g. { "000": 3, "101": 2 } — done in JS rather than a $group-of-$group
  // aggregation stage, since Mongo has no simple "value counts" accumulator.
  const cities = result.map((c) => {
    const bucketCounts: Record<string, number> = {};
    for (const k of c.buckets as string[]) bucketCounts[k] = (bucketCounts[k] ?? 0) + 1;
    const { buckets: _buckets, ...rest } = c;
    return { ...rest, buckets: bucketCounts };
  });

  return NextResponse.json({ cities });
});
