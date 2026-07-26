import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { formatTrip } from "@/models/Trip";
import { removeCollaborator } from "@/lib/services/trips.service";

interface RouteContext {
  params: Promise<{ id: string; userId: string }>;
}

export const OPTIONS = corsPreflight;

/** DELETE /api/trips/:id/collaborators/:userId — owner-only; removes the collaborator */
export const DELETE = withApiHandler<RouteContext>("DELETE /api/trips/[id]/collaborators/[userId]", async (req, { params }) => {
  const { id: tripId, userId: targetUserId } = await params;
  const payload = getUserFromRequest(req);

  const trip = await removeCollaborator(payload, tripId, targetUserId);
  return NextResponse.json(formatTrip(trip));
});
