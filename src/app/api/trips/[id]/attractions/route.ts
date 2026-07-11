import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";
import { Trip } from "@/models/Trip";
import { Attraction, formatAttraction } from "@/models/Attraction";
import { AttractionType } from "@/models/AttractionType";
import type { Attraction as AttractionShape } from "@/types/attraction";

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
    if (typeFilter) {
      const typeDoc = await AttractionType.findOne({ name: typeFilter }).select("_id");
      if (!typeDoc) return NextResponse.json([]);
      query.types = typeDoc._id;
    }

    const docs = await Attraction.find(query)
      .populate("types")
      .sort(sort === "price" ? { price: 1 } : undefined)
      .exec();

    const result = docs.map((doc) => {
      const schedule = trip.schedules?.get(doc._id.toString());
      return formatAttraction(doc, schedule ?? null);
    });

    // Append custom time-slots (schedule-only entries — no Attraction document).
    // toObject({ flattenMaps: true }) bypasses Mongoose strict mode and returns raw
    // MongoDB data including fields not declared in the sub-schema (isCustomSlot, name, etc.).
    type RawEntry = {
      isCustomSlot?: boolean; name?: string; typeNames?: string[];
      price?: number | null; currency?: string; notes?: string;
      plannedDate?: string | null; plannedTime?: string | null;
      actualDurationValue?: string; actualDurationUnit?: "minutes" | "hours";
    };
    const rawTrip = trip.toObject({ flattenMaps: true }) as unknown as {
      schedules?: Record<string, RawEntry>;
    };
    const customSlots: AttractionShape[] = [];
    for (const [key, entry] of Object.entries(rawTrip.schedules ?? {})) {
      if (entry?.isCustomSlot) {
        customSlots.push({
          _id: key,
          ownerId: userId ?? "",
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
        });
      }
    }

    return NextResponse.json([...result, ...customSlots]);
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
      currency?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      openingHours?: any;
      notes?: string;
      photoUrl?: string;
      subtype?: "residence" | "flight" | "custom-slot";
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
      price, currency, openingHours, notes, photoUrl,
      subtype, residenceType, checkInDate, checkOutDate,
      flightNumber, airline, departureAirport, arrivalAirport, departureTime, arrivalTime, gate, seat,
      plannedDate, plannedTime, actualDurationValue, actualDurationUnit } = body;

    let attraction;

    if (subtype === "custom-slot") {
      if (!name?.trim()) {
        return NextResponse.json({ error: "name is required" }, { status: 400 });
      }
      const customSlotId = `cs-${new Types.ObjectId().toString()}`;
      // Use findByIdAndUpdate + $set to bypass Mongoose strict mode — trip.schedules.set()
      // + trip.save() would strip any fields not in the cached sub-schema.
      await Trip.findByIdAndUpdate(tripId, {
        $set: {
          [`schedules.${customSlotId}`]: {
            plannedDate:         plannedDate  ?? null,
            plannedTime:         plannedTime  ?? null,
            actualDurationValue: actualDurationValue || undefined,
            actualDurationUnit:  actualDurationUnit  || undefined,
            isCustomSlot: true,
            name:         name.trim(),
            typeNames:    types ?? [],
            price:        price ?? null,
            currency:     currency || "USD",
            notes:        notes   || undefined,
          },
        },
      });

      return NextResponse.json({
        _id: customSlotId,
        ownerId: payload.userId,
        name: name.trim(),
        country: "",
        city: "",
        coordinates: null,
        types: types ?? [],
        price: price ?? null,
        currency: currency || "USD",
        notes: notes || undefined,
        subtype: "custom-slot",
        plannedDate: plannedDate ?? null,
        plannedTime: plannedTime ?? null,
        actualDurationValue: actualDurationValue || undefined,
        actualDurationUnit:  actualDurationUnit  || undefined,
      } satisfies AttractionShape, { status: 201 });
    } else if (existingAttractionId) {
      attraction = await Attraction.findById(existingAttractionId);
      if (!attraction) {
        return NextResponse.json({ error: "Attraction not found" }, { status: 404 });
      }
    } else {
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
        const typeIds = types?.length
          ? (await AttractionType.find({ name: { $in: types } }).select("_id")).map((d) => d._id)
          : [];

        attraction = await Attraction.create({
          ownerId: payload.userId,
          name: name.trim(),
          country: country.trim(),
          city: city.trim(),
          coordinates: coordinates ?? null,
          types: typeIds,
          durationValue: durationValue || undefined,
          durationUnit: durationUnit || undefined,
          price: price ?? null,
          currency: currency || "USD",
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
      await attraction.populate("types");
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
    await attraction.populate("types");

    return NextResponse.json(formatAttraction(attraction, scheduleEntry), { status: 201 });
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (msg.includes("E11000")) {
      return NextResponse.json({ error: "An attraction with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create attraction" }, { status: 500 });
  }
}
