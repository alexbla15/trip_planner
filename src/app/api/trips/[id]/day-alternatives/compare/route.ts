import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { badRequest } from "@/lib/apiError";
import { getDayAlternativeComparison } from "@/lib/services/attractions.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const OPTIONS = corsPreflight;

/** Read-only: every version of one day (main schedule + every alternative ever created
 *  for it), each resolved into a light item list — for a side-by-side comparison view. */
export const GET = withApiHandler<RouteContext>("GET /api/trips/[id]/day-alternatives/compare", async (req, { params }) => {
  const { id: tripId } = await params;
  const payload = getUserFromRequest(req);
  const day = new URL(req.url).searchParams.get("day");
  if (!day) throw badRequest("day is required");

  const versions = await getDayAlternativeComparison(payload, tripId, day);
  return NextResponse.json(versions);
});
