import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";
import { Trip } from "@/models/Trip";
import { Attraction, formatAttraction } from "@/models/Attraction";
import type { Attraction as AttractionShape } from "@/types/attraction";

interface RouteContext {
  params: Promise<{ id: string; attractionId: string }>;
}

/** PATCH — update trip-specific schedule for one attraction (or all fields for a custom time-slot) */
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
      // Custom time-slot fields (only when attractionId starts with "cs-")
      name?: string;
      typeNames?: string[];
      price?: number | null;
      currency?: string;
      notes?: string;
    };

    const isCustomSlot = attractionId.startsWith("cs-");

    // Build a $set using deep dot-notation paths so MongoDB patches fields in-place.
    const scheduleSet: Record<string, unknown> = {};
    const p = `schedules.${attractionId}`;
    if (body.plannedDate         !== undefined) scheduleSet[`${p}.plannedDate`]         = body.plannedDate;
    if (body.plannedTime         !== undefined) scheduleSet[`${p}.plannedTime`]         = body.plannedTime;
    if (body.actualDurationValue !== undefined) scheduleSet[`${p}.actualDurationValue`] = body.actualDurationValue;
    if (body.actualDurationUnit  !== undefined) scheduleSet[`${p}.actualDurationUnit`]  = body.actualDurationUnit;

    if (isCustomSlot) {
      if (body.name      !== undefined) scheduleSet[`${p}.name`]      = body.name;
      if (body.typeNames !== undefined) scheduleSet[`${p}.typeNames`] = body.typeNames;
      if (body.price     !== undefined) scheduleSet[`${p}.price`]     = body.price;
      if (body.currency  !== undefined) scheduleSet[`${p}.currency`]  = body.currency;
      if (body.notes     !== undefined) scheduleSet[`${p}.notes`]     = body.notes;
    }

    const updatedTrip = await Trip.findByIdAndUpdate(
      tripId,
      { $set: scheduleSet },
      { new: true }
    );

    if (isCustomSlot) {
      // Use toObject({ flattenMaps: true }) to bypass Mongoose strict mode — schedules.get()
      // returns a sub-document that strips fields absent from the cached sub-schema.
      type RawEntry = {
        isCustomSlot?: boolean; name?: string; typeNames?: string[];
        price?: number | null; currency?: string; notes?: string;
        plannedDate?: string | null; plannedTime?: string | null;
        actualDurationValue?: string; actualDurationUnit?: "minutes" | "hours";
      };
      const rawTrip = updatedTrip?.toObject({ flattenMaps: true }) as unknown as {
        schedules?: Record<string, RawEntry>;
      } | null;
      const entry = rawTrip?.schedules?.[attractionId];
      if (!entry) return NextResponse.json({ error: "Custom slot not found" }, { status: 404 });
      return NextResponse.json({
        _id: attractionId,
        ownerId: payload.userId,
        name: entry.name ?? "",
        country: "",
        city: "",
        coordinates: null,
        types: entry.typeNames ?? [],
        price: entry.price ?? null,
        currency: entry.currency ?? "USD",
        notes: entry.notes,
        subtype: "custom-slot",
        plannedDate: entry.plannedDate ?? null,
        plannedTime: entry.plannedTime ?? null,
        actualDurationValue: entry.actualDurationValue,
        actualDurationUnit: entry.actualDurationUnit,
      } satisfies AttractionShape);
    }

    const updatedSchedule = updatedTrip?.schedules?.get(attractionId) ?? null;
    const attraction = await Attraction.findById(attractionId);
    if (!attraction) return NextResponse.json({ error: "Attraction not found" }, { status: 404 });

    return NextResponse.json(formatAttraction(attraction, updatedSchedule));
  } catch (err) {
    console.error("[PATCH /api/trips/:id/attractions/:attractionId]", err);
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  }
}

/** DELETE — unlink attraction from this trip (or remove a custom time-slot entirely).
 *  Regular Attraction documents are NOT deleted from the DB — they remain global entities. */
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

    if (attractionId.startsWith("cs-")) {
      // Custom time-slot: exists only in schedules — no attractionIds entry to remove
      if (trip.schedules?.has(attractionId)) {
        trip.schedules.delete(attractionId);
        await trip.save();
      }
      return NextResponse.json({ message: "Removed from itinerary" });
    }

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
