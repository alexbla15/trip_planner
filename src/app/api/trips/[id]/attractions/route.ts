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
      notes?: string;
      photoUrl?: string;
      // Subtype
      subtype?: "residence" | "flight";
      residenceType?: string;
      checkInDate?: string;
      checkOutDate?: string;
      flightNumber?: string;
      airline?: string;
      departureAirport?: string;
      arrivalAirport?: string;
      departureTime?: string;
      arrivalTime?: string;
      gate?: string;
      seat?: string;
      plannedDate?: string | null;
      plannedTime?: string | null;
      actualDurationValue?: string;
      actualDurationUnit?: "minutes" | "hours";
    };

    const { name, country, city, coordinates, types, durationValue, durationUnit, price, openingHours, notes, photoUrl,
      subtype, residenceType, checkInDate, checkOutDate,
      flightNumber, airline, departureAirport, arrivalAirport, departureTime, arrivalTime, gate, seat,
      plannedDate, plannedTime, actualDurationValue, actualDurationUnit } = body;

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
      notes: notes || undefined,
      photoUrl: photoUrl || undefined,
      subtype: subtype || undefined,
      residenceType: residenceType || undefined,
      checkInDate: checkInDate || undefined,
      checkOutDate: checkOutDate || undefined,
      flightNumber: flightNumber || undefined,
      airline: airline || undefined,
      departureAirport: departureAirport || undefined,
      arrivalAirport: arrivalAirport || undefined,
      departureTime: departureTime || undefined,
      arrivalTime: arrivalTime || undefined,
      gate: gate || undefined,
      seat: seat || undefined,
      plannedDate: plannedDate ?? null,
      plannedTime: plannedTime ?? null,
      actualDurationValue: actualDurationValue || undefined,
      actualDurationUnit: actualDurationUnit || undefined,
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
