import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";
import { Attraction, formatAttraction } from "@/models/Attraction";
import { Trip } from "@/models/Trip";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const payload = getUserFromRequest(req);
    await dbConnect();

    const attraction = await Attraction.findOne({ _id: id, ownerId: payload.userId });
    if (!attraction) {
      return NextResponse.json({ error: "Attraction not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, country, city, coordinates, types, durationValue, durationUnit, price, openingHours, notes, photoUrl } =
      body as Record<string, unknown>;

    if (name) attraction.name = name as string;
    if (country) attraction.country = country as string;
    if (city) attraction.city = city as string;
    if (coordinates !== undefined) attraction.coordinates = coordinates as { lat: number; lng: number } | null;
    if (types) attraction.types = types as string[];
    if (durationValue !== undefined) attraction.durationValue = durationValue as string;
    if (durationUnit !== undefined) attraction.durationUnit = durationUnit as "minutes" | "hours";
    if (price !== undefined) attraction.price = price as number | null;
    if (openingHours !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      attraction.openingHours = openingHours as any;
    }
    if (notes !== undefined) attraction.notes = notes as string;
    if (photoUrl !== undefined) attraction.photoUrl = photoUrl as string;

    await attraction.save();
    return NextResponse.json(formatAttraction(attraction));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const payload = getUserFromRequest(req);
    await dbConnect();

    const attraction = await Attraction.findOne({ _id: id, ownerId: payload.userId });
    if (!attraction) {
      return NextResponse.json({ error: "Attraction not found" }, { status: 404 });
    }

    const tripId = attraction.tripId;

    // Delete the attraction document
    await attraction.deleteOne();

    // Clean up the reference in the parent trip
    await Trip.findByIdAndUpdate(tripId, {
      $pull: { attractionIds: id },
    });

    return NextResponse.json({ message: "Attraction deleted" });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
