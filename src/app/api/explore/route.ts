import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { Trip } from "@/models/Trip";
import type { ExploreItem } from "@/types/trip";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";

export const OPTIONS = corsPreflight;

interface PopulatedOwner { name: string; avatarUrl?: string }
interface PopulatedAttraction { city: string }

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

export const GET = withApiHandler("GET /api/explore", async (req: Request) => {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const skip = Math.max(0, Number(searchParams.get("skip") ?? 0) || 0);
  const requestedLimit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, requestedLimit), MAX_LIMIT);

  const filter = { coverImage: { $exists: true, $ne: "" }, isPrivate: { $ne: true } };

  const [trips, total] = await Promise.all([
    Trip.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("_id name coverImage moods attractionIds ownerId")
      .populate<{ ownerId: PopulatedOwner | null }>("ownerId", "name avatarUrl")
      .populate<{ attractionIds: PopulatedAttraction[] }>("attractionIds", "city"),
    Trip.countDocuments(filter),
  ]);

  const items: ExploreItem[] = trips.map((trip) => {
    const attractions = trip.attractionIds as unknown as PopulatedAttraction[];
    const cities = [...new Set(attractions.map((a) => a.city).filter(Boolean))].sort();
    return {
      id: trip._id.toString(),
      destination: trip.name,
      coverImage: trip.coverImage as string,
      tag: trip.moods?.[0] ?? "Adventure",
      tags: trip.moods?.length ? trip.moods : ["Adventure"],
      user:          (trip.ownerId as PopulatedOwner | null)?.name ?? "traveler",
      userAvatarUrl: (trip.ownerId as PopulatedOwner | null)?.avatarUrl,
      likes: attractions.length,
      cities,
    };
  });

  return NextResponse.json(items, {
    headers: {
      "X-Total-Count": String(total),
      "X-Skip": String(skip),
      "X-Limit": String(limit),
    },
  });
});
