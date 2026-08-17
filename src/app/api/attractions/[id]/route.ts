import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { formatAttraction } from "@/models/Attraction";
import { updateAttraction, deleteAttraction } from "@/lib/services/attractions.service";
import { isAttractionVisited } from "@/lib/services/visited.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const OPTIONS = corsPreflight;

export const PUT = withApiHandler<RouteContext>("PUT /api/attractions/[id]", async (req, { params }) => {
  const { id } = await params;
  const payload = getUserFromRequest(req);
  const body = await req.json() as Record<string, unknown>;

  const attraction = await updateAttraction(payload, id, body);
  const isVisited = await isAttractionVisited(payload.userId, attraction._id.toString());
  return NextResponse.json(formatAttraction(attraction, null, undefined, isVisited));
});

export const DELETE = withApiHandler<RouteContext>("DELETE /api/attractions/[id]", async (req, { params }) => {
  const { id } = await params;
  const payload = getUserFromRequest(req);

  await deleteAttraction(payload, id);
  return NextResponse.json({ message: "Attraction deleted" });
});
