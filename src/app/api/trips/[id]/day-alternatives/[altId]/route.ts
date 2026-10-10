import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { renameDayAlternative, deleteDayAlternative } from "@/lib/services/attractions.service";

interface RouteContext {
  params: Promise<{ id: string; altId: string }>;
}

export const OPTIONS = corsPreflight;

export const PATCH = withApiHandler<RouteContext>("PATCH /api/trips/[id]/day-alternatives/[altId]", async (req, { params }) => {
  const { id: tripId, altId } = await params;
  const payload = getUserFromRequest(req);
  const body = await req.json();
  const { name } = body as { name?: unknown };

  const alternative = await renameDayAlternative(payload, tripId, altId, name);
  return NextResponse.json(alternative);
});

export const DELETE = withApiHandler<RouteContext>("DELETE /api/trips/[id]/day-alternatives/[altId]", async (req, { params }) => {
  const { id: tripId, altId } = await params;
  const payload = getUserFromRequest(req);

  await deleteDayAlternative(payload, tripId, altId);
  return NextResponse.json({ message: "Alternative deleted" });
});
