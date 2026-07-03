import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";
import { Trip } from "@/models/Trip";
import { Attraction, formatAttraction } from "@/models/Attraction";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getAuthedTrip(req: Request, tripId: string, requireOwner = true) {
  const payload = getUserFromRequest(req);
  await dbConnect();
  const trip = requireOwner
    ? await Trip.findOne({ _id: tripId, ownerId: payload.userId })
    : await Trip.findById(tripId);
  return { trip, payload };
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { id: tripId } = await params;
    // Any authenticated user can view a trip's attractions
    getUserFromRequest(req);
    await dbConnect();

    const trip = await Trip.findById(tripId);
    if (!trip) return NextResponse.json([], { status: 200 });

    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get("type");
    const sort       = searchParams.get("sort");

    // Fetch the global attraction documents by the trip's attractionIds
    const query: Record<string, unknown> = { _id: { $in: trip.attractionIds } };
    if (typeFilter) query.types = typeFilter;

    const docs = await Attraction.find(query)
      .sort(sort === "price" ? { price: 1 } : undefined)
      .exec();

    // Merge each attraction with its trip-specific schedule entry
    const result = docs.map((doc) => {
      const schedule = trip.schedules?.get(doc._id.toString());
      return formatAttraction(doc, schedule ?? null);
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { id: tripId } = await params;
    const { trip, payload } = await getAuthedTrip(req, tripId);
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

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
      // Schedule fields (trip-specific — stored in Trip.schedules, not on Attraction)
      plannedDate?: string | null;
      plannedTime?: string | null;
      actualDurationValue?: string;
      actualDurationUnit?: "minutes" | "hours";
    };

    const { name, country, city, coordinates, types, durationValue, durationUnit,
      price, openingHours, notes, photoUrl,
      subtype, residenceType, checkInDate, checkOutDate,
      flightNumber, airline, departureAirport, arrivalAirport, departureTime, arrivalTime, gate, seat,
      plannedDate, plannedTime, actualDurationValue, actualDurationUnit } = body;

    if (!name?.trim() || !country?.trim() || !city?.trim()) {
      return NextResponse.json(
        { error: "name, country, and city are required" },
        { status: 400 }
      );
    }

    // Find existing attraction by name (case-insensitive) — attractions are global entities
    let attraction = await Attraction.findOne(
      { name: name.trim() },
      undefined,
      { collation: { locale: "en", strength: 2 } }
    );

    if (!attraction) {
      // Create new global attraction (no tripId — it belongs to no single trip)
      attraction = await Attraction.create({
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
      });
    }

    const attractionId = attraction._id.toString();

    // Check if already in this trip
    const alreadyLinked = trip.attractionIds.some(
      (id) => id.toString() === attractionId
    );
    if (alreadyLinked) {
      // Just return the existing entry (merged with schedule)
      const schedule = trip.schedules?.get(attractionId);
      return NextResponse.json(formatAttraction(attraction, schedule ?? null), { status: 200 });
    }

    // Link attraction to trip
    trip.attractionIds.push(attraction._id);

    // Create / update the schedule entry with any supplied scheduling fields
    const scheduleEntry = {
      plannedDate: plannedDate ?? null,
      plannedTime: plannedTime ?? null,
      actualDurationValue: actualDurationValue || undefined,
      actualDurationUnit: actualDurationUnit || undefined,
    };
    if (!trip.schedules) trip.set("schedules", new Map());
    trip.schedules.set(attractionId, scheduleEntry);

    await trip.save();

    return NextResponse.json(formatAttraction(attraction, scheduleEntry), { status: 201 });
  } catch (err) {
    const msg = (err as Error).message ?? "";
    // Duplicate key on name index
    if (msg.includes("E11000")) {
      return NextResponse.json({ error: "An attraction with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create attraction" }, { status: 500 });
  }
}
