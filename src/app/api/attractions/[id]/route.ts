import { NextResponse } from "next/server";
import { type Types } from "mongoose";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";
import { Attraction, formatAttraction } from "@/models/Attraction";
import { AttractionType } from "@/models/AttractionType";
import { Trip } from "@/models/Trip";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: Request, { params }: RouteContext) {
  // Separate auth errors from DB/validation errors so we get proper HTTP codes
  let payload: ReturnType<typeof getUserFromRequest>;
  try {
    payload = getUserFromRequest(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await dbConnect();

    const attraction = await Attraction.findById(id);
    if (!attraction) {
      return NextResponse.json({ error: "Attraction not found" }, { status: 404 });
    }

    // Allow update if the requester owns the attraction OR is an owner/collaborator
    // of a trip that contains it (attractions are shared objects — any trip member
    // who added it should be able to edit its details, e.g. price).
    const isAttractionOwner = attraction.ownerId.toString() === payload.userId;
    if (!isAttractionOwner) {
      const hasTripAccess = await Trip.exists({
        attractionIds: id,
        $or: [{ ownerId: payload.userId }, { "collaborators.userId": payload.userId }],
      });
      if (!hasTripAccess) {
        return NextResponse.json({ error: "Attraction not found" }, { status: 404 });
      }
    }

    const body = await req.json() as Record<string, unknown>;

    // Core fields
    if (body.name)                    attraction.name          = body.name as string;
    if (body.country)                 attraction.country       = body.country as string;
    if (body.city)                    attraction.city          = body.city as string;
    if (body.coordinates !== undefined) attraction.coordinates = body.coordinates as { lat: number; lng: number } | null;
    if (body.types) {
      const names = body.types as string[];
      const typeDocs = await AttractionType.find({ name: { $in: names } }).select("_id");
      attraction.types = typeDocs.map((d) => d._id) as unknown as Types.ObjectId[];
    }
    if (body.durationValue !== undefined) attraction.durationValue = body.durationValue as string;
    if (body.durationUnit  !== undefined) attraction.durationUnit  = body.durationUnit  as "minutes" | "hours";
    if (body.price !== undefined)     attraction.price         = body.price as number | null;
    if (body.currency !== undefined)  attraction.currency      = body.currency as string;
    if (body.openingHours !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      attraction.openingHours = body.openingHours as any;
    }
    if (body.notes    !== undefined)  attraction.notes    = body.notes    as string;
    if (body.photoUrl !== undefined)  attraction.photoUrl = body.photoUrl as string;

    // NOTE: plannedDate, plannedTime, actualDuration* are now trip-specific schedule fields
    // and live in Trip.schedules — they are NOT updated here.
    // Use PATCH /api/trips/:id/attractions/:attractionId for scheduling.

    // Subtype fields
    if (body.subtype !== undefined)           attraction.subtype           = body.subtype           as "residence" | "flight";
    if (body.residenceType !== undefined)     attraction.residenceType     = body.residenceType     as string;
    if (body.checkInDate !== undefined)       attraction.checkInDate       = body.checkInDate       as string;
    if (body.checkOutDate !== undefined)      attraction.checkOutDate      = body.checkOutDate      as string;
    if (body.flightNumber !== undefined)      attraction.flightNumber      = body.flightNumber      as string;
    if (body.airline !== undefined)           attraction.airline           = body.airline           as string;
    if (body.departureAirport !== undefined)  attraction.departureAirport  = body.departureAirport  as string;
    if (body.arrivalAirport !== undefined)    attraction.arrivalAirport    = body.arrivalAirport    as string;
    if (body.departureTime !== undefined)     attraction.departureTime     = body.departureTime     as string;
    if (body.arrivalTime !== undefined)       attraction.arrivalTime       = body.arrivalTime       as string;
    if (body.gate !== undefined)              attraction.gate              = body.gate              as string;
    if (body.seat !== undefined)              attraction.seat              = body.seat              as string;

    await attraction.save();
    await attraction.populate("types");
    return NextResponse.json(formatAttraction(attraction));
  } catch (err) {
    console.error("[PUT /api/attractions/:id]", err);
    return NextResponse.json({ error: "Failed to update attraction" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  let payload: ReturnType<typeof getUserFromRequest>;
  try {
    payload = getUserFromRequest(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await dbConnect();

    const attraction = await Attraction.findOne({ _id: id, ownerId: payload.userId });
    if (!attraction) {
      return NextResponse.json({ error: "Attraction not found" }, { status: 404 });
    }

    // Hard-delete the global attraction document.
    // To unlink from a single trip without deleting, use
    // DELETE /api/trips/:tripId/attractions/:attractionId instead.
    await attraction.deleteOne();

    return NextResponse.json({ message: "Attraction deleted" });
  } catch (err) {
    console.error("[DELETE /api/attractions/:id]", err);
    return NextResponse.json({ error: "Failed to delete attraction" }, { status: 500 });
  }
}
