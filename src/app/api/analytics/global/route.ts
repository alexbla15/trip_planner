import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { Trip } from "@/models/Trip";
import { Attraction } from "@/models/Attraction";
import { User } from "@/models/User";

export async function GET() {
  try {
    await dbConnect();

    const [
      totalTrips,
      totalAttractions,
      totalUsers,
      uniqueCities,
      uniqueCountries,
      budgetResult,
      categoryDistribution,
      topUsers,
      topTrips,
      topCountries,
      topCities,
    ] = await Promise.all([
      Trip.countDocuments(),
      Attraction.countDocuments(),
      User.countDocuments(),
      Attraction.distinct("city"),
      Trip.distinct("country"),
      Trip.aggregate([{ $group: { _id: null, total: { $sum: "$budget" } } }]),
      Attraction.aggregate([
        { $unwind: "$types" },
        { $group: { _id: "$types", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Start from users so that accounts with zero attractions are included
      User.aggregate([
        {
          $lookup: {
            from: "attractions",
            let: { uid: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$ownerId", "$$uid"] } } },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 },
                  cities: { $addToSet: "$city" },
                },
              },
            ],
            as: "attractionStats",
          },
        },
        {
          $project: {
            ownerId: { $toString: "$_id" },
            name: 1,
            attractionsCount: {
              $ifNull: [{ $arrayElemAt: ["$attractionStats.count", 0] }, 0],
            },
            countriesCount: {
              $size: {
                $ifNull: [{ $arrayElemAt: ["$attractionStats.cities", 0] }, []],
              },
            },
          },
        },
        { $sort: { attractionsCount: -1, name: 1 } },
      ]),
      // Top trips by number of saved attractions
      Trip.aggregate([
        {
          $project: {
            name: 1,
            ownerId: 1,
            attractionCount: { $size: { $ifNull: ["$attractionIds", []] } },
            tripId: { $toString: "$_id" },
          },
        },
        { $sort: { attractionCount: -1 } },
        { $limit: 10 },
      ]),
      // Top countries by attraction count
      Attraction.aggregate([
        { $group: { _id: "$country", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      // Cities by attraction count (include country + avg coordinates).
      // Not limited to a small top-N — the client filters/slices this per country.
      Attraction.aggregate([
        {
          $group: {
            _id: "$city",
            count: { $sum: 1 },
            country: { $first: "$country" },
            lat: { $avg: "$coordinates.lat" },
            lng: { $avg: "$coordinates.lng" },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    return NextResponse.json({
      summary: {
        totalTrips,
        totalAttractions,
        totalUsers,
        uniqueCitiesCovered: uniqueCities.length,
        uniqueCountriesCovered: uniqueCountries.length,
        totalPlatformBudget: (budgetResult[0]?.total as number) ?? 0,
      },
      categoryDistribution,
      topUsers,
      topTrips,
      topCountries,
      topCities,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
