import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";
import { Trip } from "@/models/Trip";
import { Attraction } from "@/models/Attraction";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req);
    await dbConnect();

    const ownerId = new mongoose.Types.ObjectId(payload.userId);

    const [
      totalTrips,
      totalAttractions,
      uniqueCities,
      uniqueCountries,
      budgetResult,
      categoryDistribution,
    ] = await Promise.all([
      Trip.countDocuments({ ownerId }),
      Attraction.countDocuments({ ownerId }),
      Attraction.distinct("city", { ownerId }),
      Trip.distinct("country", { ownerId }),
      Trip.aggregate([
        { $match: { ownerId } },
        { $group: { _id: null, total: { $sum: "$budget" } } },
      ]),
      Attraction.aggregate([
        { $match: { ownerId } },
        { $unwind: "$types" },
        { $group: { _id: "$types", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return NextResponse.json({
      summary: {
        totalTrips,
        totalAttractions,
        uniqueCitiesCovered: uniqueCities.length,
        uniqueCountriesCovered: uniqueCountries.length,
        totalPersonalBudget: (budgetResult[0]?.total as number) ?? 0,
      },
      categoryDistribution,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
