import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { swapTripDays } from "@/lib/services/trips.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const OPTIONS = corsPreflight;

export const PUT = withApiHandler<RouteContext>("PUT /api/trips/[id]/swap-days", async (req, { params }) => {
  const { id: tripId } = await params;
  const payload = getUserFromRequest(req);
  const body = await req.json();
  const { dayA, dayB } = body as { dayA?: unknown; dayB?: unknown };

  await swapTripDays(payload, tripId, dayA, dayB);
  return NextResponse.json({ message: "Days swapped" });
});
