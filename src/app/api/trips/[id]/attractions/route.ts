import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { listTripAttractions, addAttractionToTrip } from "@/lib/services/attractions.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const OPTIONS = corsPreflight;

export const GET = withApiHandler<RouteContext>("GET /api/trips/[id]/attractions", async (req, { params }) => {
  const { id: tripId } = await params;

  // Auth is optional — non-private trips are readable without a token
  let userId: string | null = null;
  try { userId = getUserFromRequest(req).userId; } catch { /* unauthenticated */ }

  const { searchParams } = new URL(req.url);
  const result = await listTripAttractions(userId, tripId, {
    type: searchParams.get("type"),
    sort: searchParams.get("sort"),
  });

  return NextResponse.json(result);
});

export const POST = withApiHandler<RouteContext>("POST /api/trips/[id]/attractions", async (req, { params }) => {
  const { id: tripId } = await params;
  const payload = getUserFromRequest(req);
  const body = await req.json();

  const { data, status } = await addAttractionToTrip(payload, tripId, body);
  return NextResponse.json(data, { status });
});
