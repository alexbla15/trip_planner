import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";
import { Trip } from "@/models/Trip";
import { Attraction, formatAttraction } from "@/models/Attraction";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Resolves a trip for mutation — owner or collaborator both qualify. */
async function getAuthedTrip(req: Request, tripId: string) {
  const payload = getUserFromRequest(req);
  await dbConnect();
  const trip = await Trip.findOne({
    _id: tripId,
    $or: [
      { ownerId: payload.userId },
      { "collaborators.userId": payload.userId },
    ],
  });
  return { trip, payload };
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { id: tripId } = await params;
    await dbConnect();

    // Auth is optional — non-private trips are readable without a token
    let userId: string | null = null;
    try { userId = getUserFromRequest(req).userId; } catch { /* unauthenticated */ }

    const tripQuery = userId
      ? {
          _id: tripId,
          $or: [
            { ownerId: userId },
            { "collaborators.userId": userId },
            { isPrivate: { $ne: true } },
          ],
        }
      : { _id: tripId, isPrivate: { $ne: true } };

    const trip = await Trip.findOne(tripQuery);
    if (!trip) return NextResponse.json([], { status: 200 });

    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get("type");
    const sort       = searchParams.get("sort");

    const query: Record<string, unknown> = { _id: { $in: trip.attractionIds } };
    if (typeFilter) query.types = typeFilter;

    const docs = await Attraction.find(query)
      .sort(sort === "price" ? { price: 1 } : undefined)
      .exec();

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
      existingAttractionId?: string;
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

    const { existingAttractionId, name, country, city, coordinates, types, durationValue, durationUnit,
      price, openingHours, notes, photoUrl,
      subtype, residenceType, checkInDate, checkOutDate,
      flightNumber, airline, departureAirport, arrivalAirport, departureTime, arrivalTime, gate, seat,
      plannedDate, plannedTime, actualDurationValue, actualDurationUnit } = body;

    let attraction;

    if (existingAttractionId) {
      // Linking an existing attraction from the global DB — find it directly by ID
      attraction = await Attraction.findById(existingAttractionId);
      if (!attraction) {
        return NextResponse.json({ error: "Attraction not found" }, { status: 404 });
      }
    } else {
      // Creating or re-linking by name (new attraction flow)
      if (!name?.trim() || !country?.trim() || !city?.trim()) {
        return NextResponse.json(
          { error: "name, country, and city are required" },
          { status: 400 }
        );
      }

      attraction = await Attraction.findOne(
        { name: name.trim() },
        undefined,
        { collation: { locale: "en", strength: 2 } }
      );

      if (!attraction) {
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
    }

    const attractionId = attraction._id.toString();

    const alreadyLinked = trip.attractionIds.some(
      (id) => id.toString() === attractionId
    );
    if (alreadyLinked) {
      const schedule = trip.schedules?.get(attractionId);
      return NextResponse.json(formatAttraction(attraction, schedule ?? null), { status: 200 });
    }

    trip.attractionIds.push(attraction._id);

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
    if (msg.includes("E11000")) {
      return NextResponse.json({ error: "An attraction with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create attraction" }, { status: 500 });
  }
}
