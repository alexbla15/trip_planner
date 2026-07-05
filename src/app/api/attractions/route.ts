import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";
import { Attraction, formatAttraction } from "@/models/Attraction";
import { Trip } from "@/models/Trip";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country");
    const q = searchParams.get("q");
    const type = searchParams.get("type");

    if (!country?.trim()) {
      return NextResponse.json({ error: "country param is required" }, { status: 400 });
    }

    await dbConnect();

    // Optional auth — used to determine which private-trip attractions are visible
    let userId: string | null = null;
    try { userId = getUserFromRequest(req).userId; } catch { /* unauthenticated */ }

    // Attraction IDs that live exclusively on inaccessible private trips must be hidden.
    // An attraction is safe to show if it appears in at least one accessible trip
    // (public, or owned/collaborated by the caller) — or in no trip at all.
    const privateFilter = userId
      ? { isPrivate: true, ownerId: { $ne: userId }, "collaborators.userId": { $ne: userId } }
      : { isPrivate: true };

    const accessibleFilter = userId
      ? { $or: [{ ownerId: userId }, { "collaborators.userId": userId }, { isPrivate: { $ne: true } }] }
      : { isPrivate: { $ne: true } };

    const [privateTrips, accessibleTrips] = await Promise.all([
      Trip.find(privateFilter).select("attractionIds").lean(),
      Trip.find(accessibleFilter).select("attractionIds").lean(),
    ]);

    const privateIds    = new Set(privateTrips.flatMap((t) => (t.attractionIds ?? []).map((id) => id.toString())));
    const accessibleIds = new Set(accessibleTrips.flatMap((t) => (t.attractionIds ?? []).map((id) => id.toString())));

    // Only hide attractions that are in a private trip AND absent from every accessible trip
    const hiddenIds = [...privateIds].filter((id) => !accessibleIds.has(id));

    const filter: Record<string, unknown> = { country };
    if (q?.trim())    filter.name  = { $regex: q.trim(), $options: "i" };
    if (type?.trim()) filter.types = type.trim();
    if (hiddenIds.length > 0) filter._id = { $nin: hiddenIds };

    const attractions = await Attraction.find(filter).sort({ name: 1 }).limit(20);
    return NextResponse.json(attractions.map((doc) => formatAttraction(doc, null)));
  } catch {
    return NextResponse.json({ error: "Failed to search attractions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = getUserFromRequest(req);
    await dbConnect();

    const body = await req.json() as {
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
    };

    const { name, country, city, coordinates, types, durationValue, durationUnit,
      price, currency, openingHours, notes, photoUrl } = body;

    if (!name?.trim() || !country?.trim() || !city?.trim()) {
      return NextResponse.json({ error: "name, country, and city are required" }, { status: 400 });
    }

    const existing = await Attraction.findOne(
      { name: name.trim() },
      undefined,
      { collation: { locale: "en", strength: 2 } }
    );
    if (existing) {
      return NextResponse.json({ error: "An attraction with this name already exists" }, { status: 409 });
    }

    const attraction = await Attraction.create({
      ownerId: payload.userId,
      name: name.trim(),
      country: country.trim(),
      city: city.trim(),
      coordinates: coordinates ?? null,
      types: types ?? [],
      durationValue: durationValue || undefined,
      durationUnit: durationUnit || undefined,
      price: price ?? null,
      currency: currency || "USD",
      openingHours: openingHours ?? undefined,
      notes: notes || undefined,
      photoUrl: photoUrl || undefined,
    });

    return NextResponse.json(formatAttraction(attraction, null), { status: 201 });
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (msg.includes("E11000")) {
      return NextResponse.json({ error: "An attraction with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create attraction" }, { status: 500 });
  }
}
