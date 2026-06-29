import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";
import { Trip } from "@/models/Trip";
import { Attraction, formatAttraction } from "@/models/Attraction";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function verifyTripOwnership(req: Request, tripId: string) {
  const payload = getUserFromRequest(req);
  await dbConnect();
  const trip = await Trip.findOne({ _id: tripId, ownerId: payload.userId });
  if (!trip) throw new Error("Trip not found or not owned");
  return { trip, payload };
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { id: tripId } = await params;
    // Any authenticated user can view a trip's attractions — ownership not required for reads
    getUserFromRequest(req);
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const sort = searchParams.get("sort");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { tripId };
    if (type) filter.types = type;

    const query = Attraction.find(filter);
    if (sort === "price") query.sort({ price: 1 });

    const attractions = await query.exec();
    return NextResponse.json(attractions.map(formatAttraction));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { id: tripId } = await params;
    const { trip, payload } = await verifyTripOwnership(req, tripId);

    const body = await req.json() as {
      name?: string;
      country?: string;
      city?: string;
      coordinates?: { lat: number; lng: number } | null;
      types?: string[];
      durationValue?: string;
      durationUnit?: "minutes" | "hours";
      price?: number | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      openingHours?: any;
    };

    const { name, country, city, coordinates, types, durationValue, durationUnit, price, openingHours } = body;

    if (!name?.trim() || !country?.trim() || !city?.trim()) {
      return NextResponse.json(
        { error: "name, country, and city are required" },
        { status: 400 }
      );
    }

    const attraction = await Attraction.create({
      tripId: trip._id,
      ownerId: payload.userId,
      name: name.trim(),
      country: country.trim(),
      city: city.trim(),
      coordinates: coordinates ?? null,
      types: types ?? [],
      durationValue: durationValue || undefined,
      durationUnit: durationUnit || undefined,
      price: price ?? null,
      openingHours: openingHours ?? undefined,
    });

    // Push the new attraction id onto the trip
    await Trip.findByIdAndUpdate(tripId, {
      $push: { attractionIds: attraction._id },
    });

    return NextResponse.json(formatAttraction(attraction), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create attraction" }, { status: 500 });
  }
}
