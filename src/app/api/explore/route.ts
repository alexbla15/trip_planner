import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { Trip } from "@/models/Trip";
import type { ExploreItem } from "@/types/trip";

interface PopulatedOwner { name: string; avatarUrl?: string }

export async function GET() {
  try {
    await dbConnect();

    const trips = await Trip.find({
      coverImage: { $exists: true, $ne: "" },
      isPrivate: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .limit(24)
      .select("_id name coverImage moods attractionIds ownerId")
      .populate<{ ownerId: PopulatedOwner | null }>("ownerId", "name avatarUrl");

    const items: ExploreItem[] = trips.map((trip) => ({
      id: trip._id.toString(),
      destination: trip.name,
      coverImage: trip.coverImage as string,
      tag: trip.moods?.[0] ?? "Adventure",
      tags: trip.moods?.length ? trip.moods : ["Adventure"],
      user:           (trip.ownerId as PopulatedOwner | null)?.name ?? "traveler",
      userAvatarUrl: (trip.ownerId as PopulatedOwner | null)?.avatarUrl,
      likes: trip.attractionIds?.length ?? 0,
    }));

    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Failed to fetch explore items" }, { status: 500 });
  }
}
