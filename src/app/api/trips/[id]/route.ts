import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";
import { Trip, formatTrip } from "@/models/Trip";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Resolves a trip document by ID with access-control.
 *  ownerOnly=true  → only the trip owner passes (used for DELETE).
 *  ownerOnly=false → owner or any listed collaborator passes (used for PUT).
 */
async function resolveTrip(req: Request, id: string, ownerOnly = false) {
  const payload = getUserFromRequest(req);
  await dbConnect();
  const query = ownerOnly
    ? { _id: id, ownerId: payload.userId }
    : {
        _id: id,
        $or: [
          { ownerId: payload.userId },
          { "collaborators.userId": payload.userId },
        ],
      };
  const trip = await Trip.findOne(query).populate("collaborators.userId", "name email avatarUrl").populate("ownerId", "name avatarUrl");
  return { trip, payload };
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    await dbConnect();

    let userId: string | null = null;
    try { userId = getUserFromRequest(req).userId; } catch { /* unauthenticated */ }

    const trip = await Trip.findById(id).populate("collaborators.userId", "name email avatarUrl").populate("ownerId", "name avatarUrl");
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const isOwner        = userId && trip.ownerId.toString() === userId;
    const isCollaborator = userId && trip.collaborators.some((c) => c.userId.toString() === userId);
    const isPublic       = !trip.isPrivate;

    if (!isPublic && !isOwner && !isCollaborator) {
      return NextResponse.json({ error: "This trip is private" }, { status: 403 });
    }

    return NextResponse.json(formatTrip(trip));
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const payload = getUserFromRequest(req);
    await dbConnect();

    const body = await req.json();
    const {
      name, cities, country, coverImage, startDate, endDate,
      budget, currency, moods, notes, isPrivate,
      calDayStart, calDayEnd,
    } = body as Record<string, unknown>;

    // Build the $set object explicitly — avoids Mongoose Map-field change-detection bugs
    const $set: Record<string, unknown> = {};
    if (name)                     $set.name        = (name as string).trim();
    if (cities !== undefined)     $set.cities      = cities;
    if (country)                  $set.country     = (country as string).trim();
    if (coverImage !== undefined) $set.coverImage  = coverImage;
    if (startDate)                $set.startDate   = new Date(startDate as string);
    if (endDate)                  $set.endDate     = new Date(endDate as string);
    if (budget !== undefined)     $set.budget      = budget;
    if (currency !== undefined)   $set.currency    = currency;
    if (moods)                    $set.moods       = moods;
    if (notes !== undefined)      $set.notes       = notes;
    if (isPrivate !== undefined)   $set.isPrivate   = isPrivate;
    if (calDayStart !== undefined) $set.calDayStart = calDayStart;
    if (calDayEnd   !== undefined) $set.calDayEnd   = calDayEnd;

    const filter = {
      _id: id,
      $or: [{ ownerId: payload.userId }, { "collaborators.userId": payload.userId }],
    };

    if (Object.keys($set).length === 0) {
      const trip = await Trip.findOne(filter).populate("collaborators.userId", "name email avatarUrl").populate("ownerId", "name avatarUrl");
      if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
      return NextResponse.json(formatTrip(trip));
    }

    const updated = await Trip.findOneAndUpdate(filter, { $set }, { new: true, runValidators: true })
      .populate("collaborators.userId", "name email avatarUrl").populate("ownerId", "name avatarUrl");
    if (!updated) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    return NextResponse.json(formatTrip(updated));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    // Only the trip owner may delete; collaborators cannot.
    const { trip } = await resolveTrip(req, id, true);
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    await trip.deleteOne();
    return NextResponse.json({ message: "Trip deleted" });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
