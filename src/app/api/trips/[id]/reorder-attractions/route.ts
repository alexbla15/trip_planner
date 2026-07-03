import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";
import { Trip } from "@/models/Trip";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const { id: tripId } = await params;
    const payload = getUserFromRequest(req);
    await dbConnect();

    const trip = await Trip.findOne({
      _id: tripId,
      $or: [
        { ownerId: payload.userId },
        { "collaborators.userId": payload.userId },
      ],
    });
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const body = await req.json();
    const { attractionIds } = body as { attractionIds?: string[] };

    if (!Array.isArray(attractionIds)) {
      return NextResponse.json({ error: "attractionIds must be an array" }, { status: 400 });
    }

    await Trip.findByIdAndUpdate(tripId, { attractionIds });

    return NextResponse.json({ message: "Order updated" });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
