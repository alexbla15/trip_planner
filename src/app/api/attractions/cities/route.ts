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
    {
      $match: {
        "coordinates.lat": { $exists: true, $ne: null },
        "coordinates.lng": { $exists: true, $ne: null },
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
        lat:   { $avg: "$coordinates.lat" },
        lng:   { $avg: "$coordinates.lng" },
        count: { $sum: 1 },
        visitedCount: { $sum: { $cond: ["$isVisited", 1, 0] } },
        usedInTripCount: { $sum: { $cond: ["$isUsedInTrip", 1, 0] } },
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
        visitedCount: 1,
        unvisitedCount: { $subtract: ["$count", "$visitedCount"] },
        usedInTripCount: 1,
        notUsedInTripCount: { $subtract: ["$count", "$usedInTripCount"] },
      },
    },
    { $sort: { count: -1 } },
  ]);
  return NextResponse.json({ cities: result });
});
