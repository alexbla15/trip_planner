import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { formatTrip } from "@/models/Trip";
import { getTripForViewer, updateTrip, deleteTrip } from "@/lib/services/trips.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const OPTIONS = corsPreflight;

export const GET = withApiHandler<RouteContext>("GET /api/trips/[id]", async (req, { params }) => {
  const { id } = await params;

  // Auth is optional — non-private trips are readable without a token
  let userId: string | null = null;
  try { userId = getUserFromRequest(req).userId; } catch { /* unauthenticated */ }

  const trip = await getTripForViewer(id, userId);
  return NextResponse.json(formatTrip(trip));
});

export const PUT = withApiHandler<RouteContext>("PUT /api/trips/[id]", async (req, { params }) => {
  const { id } = await params;
  const payload = getUserFromRequest(req);
  const body = await req.json();

  const trip = await updateTrip(payload, id, body);
  return NextResponse.json(formatTrip(trip));
});

export const DELETE = withApiHandler<RouteContext>("DELETE /api/trips/[id]", async (req, { params }) => {
  const { id } = await params;
  const payload = getUserFromRequest(req);

  await deleteTrip(payload, id);
  return NextResponse.json({ message: "Trip deleted" });
});
