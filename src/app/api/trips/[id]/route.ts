import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";
import { Trip, formatTrip } from "@/models/Trip";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function resolveTrip(req: Request, id: string) {
  const payload = getUserFromRequest(req);
  await dbConnect();
  const trip = await Trip.findOne({ _id: id, ownerId: payload.userId });
  return { trip, payload };
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    // Auth still required, but any authenticated user can view any trip
    getUserFromRequest(req);
    await dbConnect();
    const trip = await Trip.findById(id);
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    return NextResponse.json(formatTrip(trip));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { trip } = await resolveTrip(req, id);
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const body = await req.json();
    const { name, cities, country, coverImage, startDate, endDate, budget, currency, moods, notes } =
      body as Record<string, unknown>;

    if (name) trip.name = (name as string).trim();
    if (cities !== undefined) trip.cities = cities as string[];
    if (country) trip.country = (country as string).trim();
    if (coverImage !== undefined) trip.coverImage = coverImage as string;
    if (startDate) trip.startDate = new Date(startDate as string);
    if (endDate) trip.endDate = new Date(endDate as string);
    if (budget !== undefined) trip.budget = budget as number;
    if (currency !== undefined) trip.currency = currency as string;
    if (moods) trip.moods = moods as string[];
    if (notes !== undefined) trip.notes = notes as string;

    await trip.save();
    return NextResponse.json(formatTrip(trip));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { trip } = await resolveTrip(req, id);
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    await trip.deleteOne();
    return NextResponse.json({ message: "Trip deleted" });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
