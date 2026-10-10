import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { createDayAlternative } from "@/lib/services/attractions.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const OPTIONS = corsPreflight;

/** Creates a new alternative plan for one day, copying whatever's currently live for
 *  that day (the main schedule, or another already-active alternative), and makes it the
 *  active one immediately. */
export const POST = withApiHandler<RouteContext>("POST /api/trips/[id]/day-alternatives", async (req, { params }) => {
  const { id: tripId } = await params;
  const payload = getUserFromRequest(req);
  const body = await req.json();
  const { day } = body as { day?: unknown };

  const alternative = await createDayAlternative(payload, tripId, day);
  return NextResponse.json(alternative, { status: 201 });
});
