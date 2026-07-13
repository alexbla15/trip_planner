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

    // Trips the user owns OR collaborates on
    const userTripFilter = {
      $or: [
        { ownerId },
        { "collaborators.userId": ownerId },
      ],
    };

    // Pre-fetch all attraction IDs accessible through those trips so we can
    // query the Attraction collection for city/category data across collaborator trips.
    const userTripDocs = await Trip.find(userTripFilter)
      .select("attractionIds")
      .lean();
    const accessibleAttractionIds = userTripDocs.flatMap(
      (t) => (t as { attractionIds?: mongoose.Types.ObjectId[] }).attractionIds ?? [],
    );
    const accessibleAttrFilter =
      accessibleAttractionIds.length > 0
        ? { _id: { $in: accessibleAttractionIds } }
        : { _id: new mongoose.Types.ObjectId() }; // guaranteed-empty sentinel

    const [
      totalTrips,
      totalAttractions,
      uniqueCities,
      uniqueCountries,
      budgetResult,
      categoryDistribution,
      topCities,
      moodDistribution,
      topTrips,
      topCountries,
    ] = await Promise.all([
      // Trip counts include collaborator trips
      Trip.countDocuments(userTripFilter),
      // Attractions count stays personal — counts what this user has added (flights excluded)
      Attraction.countDocuments({ ownerId, subtype: { $ne: "flight" } }),
      // Cities from all accessible trips (owner + collaborator), excluding blank entries and flights
      Attraction.distinct("city", { ...accessibleAttrFilter, city: { $nin: ["", null] }, subtype: { $ne: "flight" } }),
      // Countries from all accessible trips
      Trip.distinct("country", userTripFilter),
      // Budget across all accessible trips
      Trip.aggregate([
        { $match: userTripFilter },
        { $group: { _id: null, total: { $sum: "$budget" } } },
      ]),
      // Category distribution stays personal (user's own attraction creations, flights excluded)
      Attraction.aggregate([
        { $match: { ownerId, subtype: { $ne: "flight" } } },
        { $unwind: "$types" },
        {
          $lookup: {
            from: "attractiontypes",
            localField: "types",
            foreignField: "_id",
            as: "typeDoc",
          },
        },
        { $unwind: "$typeDoc" },
        { $group: { _id: "$typeDoc.name", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Top cities across all accessible trips; average coordinates for map positioning (flights excluded)
      Attraction.aggregate([
        { $match: { ...accessibleAttrFilter, city: { $nin: ["", null] }, subtype: { $ne: "flight" } } },
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
        { $limit: 20 },
      ]),
      // Mood distribution across all accessible trips
      Trip.aggregate([
        { $match: userTripFilter },
        { $unwind: "$moods" },
        {
          $lookup: {
            from: "moodtags",
            let: { moodStr: "$moods" },
            pipeline: [
              { $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$moodStr"] } } },
            ],
            as: "moodDoc",
          },
        },
        { $unwind: { path: "$moodDoc", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ["$moodDoc.name", "$moods"] },
            count: { $sum: 1 },
            icon: { $first: "$moodDoc.icon" },
            color: { $first: "$moodDoc.color" },
          },
        },
        { $sort: { count: -1 } },
      ]),
      // Top trips by attraction count across all accessible trips
      Trip.aggregate([
        { $match: userTripFilter },
        {
          $project: {
            name: 1,
            tripId: { $toString: "$_id" },
            attractionCount: { $size: "$attractionIds" },
          },
        },
        { $sort: { attractionCount: -1 } },
        { $limit: 8 },
      ]),
      // Top countries by trip count across all accessible trips
      Trip.aggregate([
        { $match: userTripFilter },
        { $group: { _id: "$country", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
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
      topCities,
      moodDistribution,
      topTrips,
      topCountries,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
