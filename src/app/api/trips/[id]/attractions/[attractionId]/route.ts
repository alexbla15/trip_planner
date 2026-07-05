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

    // Verify access without loading the full document
    const accessible = await Trip.exists({
      _id: tripId,
      $or: [
        { ownerId: payload.userId },
        { "collaborators.userId": payload.userId },
      ],
    });
    if (!accessible) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const body = await req.json() as {
      plannedDate?: string | null;
      plannedTime?: string | null;
      actualDurationValue?: string;
      actualDurationUnit?: "minutes" | "hours";
    };

    // Build a $set using deep dot-notation paths (schedules.<id>.field) so MongoDB
    // patches individual fields in-place. Avoids spreading Mongoose sub-documents
    // (which carry internal prototype properties) and bypasses Map dirty-tracking.
    const scheduleSet: Record<string, unknown> = {};
    if (body.plannedDate         !== undefined) scheduleSet[`schedules.${attractionId}.plannedDate`]         = body.plannedDate;
    if (body.plannedTime         !== undefined) scheduleSet[`schedules.${attractionId}.plannedTime`]         = body.plannedTime;
    if (body.actualDurationValue !== undefined) scheduleSet[`schedules.${attractionId}.actualDurationValue`] = body.actualDurationValue;
    if (body.actualDurationUnit  !== undefined) scheduleSet[`schedules.${attractionId}.actualDurationUnit`]  = body.actualDurationUnit;

    const updatedTrip = await Trip.findByIdAndUpdate(
      tripId,
      { $set: scheduleSet },
      { new: true }
    );

    const updatedSchedule = updatedTrip?.schedules?.get(attractionId) ?? null;

    const attraction = await Attraction.findById(attractionId);
    if (!attraction) return NextResponse.json({ error: "Attraction not found" }, { status: 404 });

    return NextResponse.json(formatAttraction(attraction, updatedSchedule));
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

    const trip = await Trip.findOne({
      _id: tripId,
      $or: [
        { ownerId: payload.userId },
        { "collaborators.userId": payload.userId },
      ],
    });
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    await Trip.findByIdAndUpdate(tripId, { $pull: { attractionIds: attractionId } });

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
