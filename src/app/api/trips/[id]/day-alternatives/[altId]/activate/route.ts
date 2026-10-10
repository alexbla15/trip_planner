import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { setDayAlternativeActive } from "@/lib/services/attractions.service";

interface RouteContext {
  params: Promise<{ id: string; altId: string }>;
}

export const OPTIONS = corsPreflight;

/** Activating makes this alternative the live version of its day — what the calendar,
 *  map, costs, and alerts all resolve into. Deactivating reverts that day to its main
 *  schedule. */
export const POST = withApiHandler<RouteContext>("POST /api/trips/[id]/day-alternatives/[altId]/activate", async (req, { params }) => {
  const { id: tripId, altId } = await params;
  const payload = getUserFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { active } = body as { active?: unknown };

  await setDayAlternativeActive(payload, tripId, altId, active !== false);
  return NextResponse.json({ message: active === false ? "Alternative deactivated" : "Alternative activated" });
});
