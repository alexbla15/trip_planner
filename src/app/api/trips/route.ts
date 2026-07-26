import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { formatTrip } from "@/models/Trip";
import { listTripsForUser, createTrip, type TripListFilter } from "@/lib/services/trips.service";

export const OPTIONS = corsPreflight;

export const GET = withApiHandler("GET /api/trips", async (req: Request) => {
  const payload = getUserFromRequest(req);

  const { searchParams } = new URL(req.url);
  const filter: TripListFilter = {
    upcoming: searchParams.get("upcoming") === "true",
    country: searchParams.get("country"),
    mood: searchParams.get("mood"),
  };

  const trips = await listTripsForUser(payload.userId, filter);
  return NextResponse.json(trips.map(formatTrip));
});

export const POST = withApiHandler("POST /api/trips", async (req: Request) => {
  const payload = getUserFromRequest(req);
  const body = await req.json();

  const trip = await createTrip(payload, body);
  return NextResponse.json(formatTrip(trip), { status: 201 });
});
