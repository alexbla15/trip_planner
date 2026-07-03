import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { getUserFromRequest } from "@/lib/auth";
import { Trip, formatTrip } from "@/models/Trip";

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req);
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const upcoming = searchParams.get("upcoming");
    const country = searchParams.get("country");
    const mood = searchParams.get("mood");

    // Return trips where the user is the owner or a listed collaborator
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      $or: [
        { ownerId: payload.userId },
        { "collaborators.userId": payload.userId },
      ],
    };

    if (upcoming === "true") {
      filter.startDate = { $gt: new Date() };
    }
    if (country) {
      filter.country = { $regex: country, $options: "i" };
    }
    if (mood) {
      filter.moods = mood;
    }

    const trips = await Trip.find(filter).sort({ startDate: -1 });
    return NextResponse.json(trips.map(formatTrip));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = getUserFromRequest(req);
    const body = await req.json();
    const { name, cities, country, coverImage, startDate, endDate, budget, currency, moods, notes } =
      body as {
        name?: string;
        cities?: string[];
        country?: string;
        coverImage?: string;
        startDate?: string;
        endDate?: string;
        budget?: number;
        currency?: string;
        moods?: string[];
        notes?: string;
      };

    if (!name?.trim() || !country?.trim() || !startDate || !endDate) {
      return NextResponse.json(
        { error: "name, country, startDate and endDate are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return NextResponse.json(
        { error: "Invalid date range" },
        { status: 400 }
      );
    }

    await dbConnect();

    const trip = await Trip.create({
      ownerId: payload.userId,
      name: name.trim(),
      cities: cities ?? [],
      country: country.trim(),
      coverImage,
      startDate: start,
      endDate: end,
      budget,
      currency,
      moods: moods ?? [],
      notes,
      attractionIds: [],
      collaborators: [],
      isPrivate: false,
    });

    return NextResponse.json(formatTrip(trip), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create trip" }, { status: 500 });
  }
}
