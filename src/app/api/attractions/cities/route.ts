import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { Attraction } from "@/models/Attraction";

export async function GET() {
  try {
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
  } catch {
    return NextResponse.json({ error: "Failed to load cities" }, { status: 500 });
  }
}
