import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { reorderTripAttractions } from "@/lib/services/trips.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const OPTIONS = corsPreflight;

export const PUT = withApiHandler<RouteContext>("PUT /api/trips/[id]/reorder-attractions", async (req, { params }) => {
  const { id: tripId } = await params;
  const payload = getUserFromRequest(req);
  const body = await req.json();
  const { attractionIds } = body as { attractionIds?: unknown };

  await reorderTripAttractions(payload, tripId, attractionIds);
  return NextResponse.json({ message: "Order updated" });
});
