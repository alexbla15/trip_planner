import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { Trip } from "@/models/Trip";
import { Attraction } from "@/models/Attraction";

export async function GET() {
  try {
    await dbConnect();

    const [
      totalTrips,
      totalAttractions,
      uniqueCities,
      uniqueCountries,
      budgetResult,
      categoryDistribution,
      topUsers,
    ] = await Promise.all([
      Trip.countDocuments(),
      Attraction.countDocuments(),
      Attraction.distinct("city"),
      Trip.distinct("country"),
      Trip.aggregate([{ $group: { _id: null, total: { $sum: "$budget" } } }]),
      Attraction.aggregate([
        { $unwind: "$types" },
        { $group: { _id: "$types", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Attraction.aggregate([
        {
          $group: {
            _id: "$ownerId",
            attractionsCount: { $sum: 1 },
            cities: { $addToSet: "$city" },
          },
        },
        {
          $project: {
            ownerId: { $toString: "$_id" },
            attractionsCount: 1,
            countriesCount: { $size: "$cities" },
          },
        },
        { $sort: { attractionsCount: -1 } },
        { $limit: 10 },
      ]),
    ]);

    return NextResponse.json({
      summary: {
        totalTrips,
        totalAttractions,
        uniqueCitiesCovered: uniqueCities.length,
        uniqueCountriesCovered: uniqueCountries.length,
        totalPlatformBudget: (budgetResult[0]?.total as number) ?? 0,
      },
      categoryDistribution,
      topUsers,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
