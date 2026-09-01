import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/mongoose";
import { Attraction } from "@/models/Attraction";
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
  const [visitedIds, usedInTripIds] = await Promise.all([
    getVisitedIdSet(userId),
    getUsedInTripIdSet(userId),
  ]);
  const visitedObjectIds = [...visitedIds].map((id) => new Types.ObjectId(id));
  const usedInTripObjectIds = [...usedInTripIds].map((id) => new Types.ObjectId(id));

  const result = await Attraction.aggregate([
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
    {
      $addFields: {
        isVisited: { $in: ["$_id", visitedObjectIds] },
        isUsedInTrip: { $in: ["$_id", usedInTripObjectIds] },
      },
    },
    {
      $group: {
        _id: { city: "$city", country: "$country" },
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
        lat: 1,
        lng: 1,
        count: 1,
        buckets: "$buckets.k",
      },
    },
    { $sort: { count: -1 } },
  ]);

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
