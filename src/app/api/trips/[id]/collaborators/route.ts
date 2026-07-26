import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { formatTrip } from "@/models/Trip";
import { addCollaborator } from "@/lib/services/trips.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const OPTIONS = corsPreflight;

/** POST /api/trips/:id/collaborators — owner-only; body: { email: string } */
export const POST = withApiHandler<RouteContext>("POST /api/trips/[id]/collaborators", async (req, { params }) => {
  const { id: tripId } = await params;
  const payload = getUserFromRequest(req);
  const body = await req.json() as { email?: string };

  const trip = await addCollaborator(payload, tripId, body.email);
  return NextResponse.json(formatTrip(trip), { status: 201 });
});
