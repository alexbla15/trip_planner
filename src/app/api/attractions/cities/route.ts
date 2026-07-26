import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { Attraction } from "@/models/Attraction";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";

export const OPTIONS = corsPreflight;

export const GET = withApiHandler("GET /api/attractions/cities", async () => {
  await dbConnect();
  const result = await Attraction.aggregate([
    {
      $match: {
        "coordinates.lat": { $exists: true, $ne: null },
        "coordinates.lng": { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: { city: "$city", country: "$country" },
        lat:   { $avg: "$coordinates.lat" },
        lng:   { $avg: "$coordinates.lng" },
        count: { $sum: 1 },
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
      },
    },
    { $sort: { count: -1 } },
  ]);
  return NextResponse.json({ cities: result });
});
