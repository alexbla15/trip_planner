import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";
import { Trip } from "@/models/Trip";

interface RouteContext {
  params: Promise<{ id: string; attractionId: string }>;
}

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const { id: tripId, attractionId } = await params;
    const payload = getUserFromRequest(req);
    await dbConnect();

    // Verify trip ownership
    const trip = await Trip.findOne({ _id: tripId, ownerId: payload.userId });
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Remove only from Trip.attractionIds — does NOT delete the Attraction document
    await Trip.findByIdAndUpdate(tripId, {
      $pull: { attractionIds: attractionId },
    });

    return NextResponse.json({ message: "Attraction removed from trip" });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
