import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";
import { Trip } from "@/models/Trip";
import { Attraction, formatAttraction } from "@/models/Attraction";

interface RouteContext {
  params: Promise<{ id: string; attractionId: string }>;
}

/** PATCH — update trip-specific schedule for one attraction */
export async function PATCH(req: Request, { params }: RouteContext) {
  let payload: ReturnType<typeof getUserFromRequest>;
  try { payload = getUserFromRequest(req); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id: tripId, attractionId } = await params;
    await dbConnect();

    const trip = await Trip.findOne({ _id: tripId, ownerId: payload.userId });
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const body = await req.json() as {
      plannedDate?: string | null;
      plannedTime?: string | null;
      actualDurationValue?: string;
      actualDurationUnit?: "minutes" | "hours";
    };

    if (!trip.schedules) trip.set("schedules", new Map());
    const existing = trip.schedules.get(attractionId) ?? {};
    const updated = {
      ...existing,
      ...(body.plannedDate          !== undefined && { plannedDate:          body.plannedDate }),
      ...(body.plannedTime          !== undefined && { plannedTime:          body.plannedTime }),
      ...(body.actualDurationValue  !== undefined && { actualDurationValue:  body.actualDurationValue }),
      ...(body.actualDurationUnit   !== undefined && { actualDurationUnit:   body.actualDurationUnit }),
    };
    trip.schedules.set(attractionId, updated);
    await trip.save();

    const attraction = await Attraction.findById(attractionId);
    if (!attraction) return NextResponse.json({ error: "Attraction not found" }, { status: 404 });

    return NextResponse.json(formatAttraction(attraction, updated));
  } catch (err) {
    console.error("[PATCH /api/trips/:id/attractions/:attractionId]", err);
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  }
}

/** DELETE — unlink attraction from this trip.
 *  The Attraction document is NOT deleted from the DB — it remains a global entity. */
export async function DELETE(req: Request, { params }: RouteContext) {
  let payload: ReturnType<typeof getUserFromRequest>;
  try { payload = getUserFromRequest(req); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id: tripId, attractionId } = await params;
    await dbConnect();

    const trip = await Trip.findOne({ _id: tripId, ownerId: payload.userId });
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    // Remove from attractionIds — attraction document itself stays in DB
    await Trip.findByIdAndUpdate(tripId, { $pull: { attractionIds: attractionId } });

    // Remove its schedule entry
    if (trip.schedules?.has(attractionId)) {
      trip.schedules.delete(attractionId);
      await trip.save();
    }

    return NextResponse.json({ message: "Removed from itinerary" });
  } catch (err) {
    console.error("[DELETE /api/trips/:id/attractions/:attractionId]", err);
    return NextResponse.json({ error: "Failed to remove from itinerary" }, { status: 500 });
  }
}
