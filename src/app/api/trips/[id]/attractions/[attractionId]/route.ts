import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { updateTripAttractionSchedule, removeAttractionFromTrip } from "@/lib/services/attractions.service";

interface RouteContext {
  params: Promise<{ id: string; attractionId: string }>;
}

export const OPTIONS = corsPreflight;

/** PATCH — update trip-specific schedule for one attraction (or all fields for a custom time-slot) */
export const PATCH = withApiHandler<RouteContext>("PATCH /api/trips/[id]/attractions/[attractionId]", async (req, { params }) => {
  const { id: tripId, attractionId } = await params;
  const payload = getUserFromRequest(req);
  const body = await req.json();

  const result = await updateTripAttractionSchedule(payload, tripId, attractionId, body);
  return NextResponse.json(result);
});

/** DELETE — unlink attraction from this trip (or remove a custom time-slot entirely).
 *  Regular Attraction documents are NOT deleted from the DB — they remain global entities. */
export const DELETE = withApiHandler<RouteContext>("DELETE /api/trips/[id]/attractions/[attractionId]", async (req, { params }) => {
  const { id: tripId, attractionId } = await params;
  const payload = getUserFromRequest(req);

  await removeAttractionFromTrip(payload, tripId, attractionId);
  return NextResponse.json({ message: "Removed from itinerary" });
});
