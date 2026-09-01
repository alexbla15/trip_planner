import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { formatAttraction } from "@/models/Attraction";
import { getAttractionById, updateAttraction, deleteAttraction } from "@/lib/services/attractions.service";
import { isAttractionVisited } from "@/lib/services/visited.service";
import { getUsedInTripNames } from "@/lib/services/usedInTrips.service";
import { getParentName, getParentPhoto, getChildCount } from "@/lib/services/nestedAttractions.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const OPTIONS = corsPreflight;

export const GET = withApiHandler<RouteContext>("GET /api/attractions/[id]", async (req, { params }) => {
  const { id } = await params;

  // Optional auth — mirrors GET /api/attractions, so isVisited/usedInTripNames resolve
  // for a logged-in caller but the fetch still works for an anonymous one.
  let userId: string | null = null;
  try { userId = getUserFromRequest(req).userId; } catch { /* unauthenticated */ }

  const attraction = await getAttractionById(id);
  const isVisited = await isAttractionVisited(userId, attraction._id.toString());
  const usedInTripNames = await getUsedInTripNames(userId, attraction._id.toString());
  const parentAttractionName = await getParentName(attraction.parentAttractionId?.toString());
  const parentAttractionPhotoUrl = await getParentPhoto(attraction.parentAttractionId?.toString());
  const childAttractionCount = await getChildCount(attraction._id.toString());
  return NextResponse.json(formatAttraction(attraction, null, undefined, isVisited, usedInTripNames, parentAttractionName, childAttractionCount, parentAttractionPhotoUrl));
});

export const PUT = withApiHandler<RouteContext>("PUT /api/attractions/[id]", async (req, { params }) => {
  const { id } = await params;
  const payload = getUserFromRequest(req);
  const body = await req.json() as Record<string, unknown>;

  const attraction = await updateAttraction(payload, id, body);
  const isVisited = await isAttractionVisited(payload.userId, attraction._id.toString());
  const usedInTripNames = await getUsedInTripNames(payload.userId, attraction._id.toString());
  const parentAttractionName = await getParentName(attraction.parentAttractionId?.toString());
  const parentAttractionPhotoUrl = await getParentPhoto(attraction.parentAttractionId?.toString());
  const childAttractionCount = await getChildCount(attraction._id.toString());
  return NextResponse.json(formatAttraction(attraction, null, undefined, isVisited, usedInTripNames, parentAttractionName, childAttractionCount, parentAttractionPhotoUrl));
});

export const DELETE = withApiHandler<RouteContext>("DELETE /api/attractions/[id]", async (req, { params }) => {
  const { id } = await params;
  const payload = getUserFromRequest(req);

  await deleteAttraction(payload, id);
  return NextResponse.json({ message: "Attraction deleted" });
});
