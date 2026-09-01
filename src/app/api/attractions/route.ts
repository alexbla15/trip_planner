import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { formatAttraction } from "@/models/Attraction";
import { searchAttractions, createAttraction } from "@/lib/services/attractions.service";
import { getVisitedIdSet } from "@/lib/services/visited.service";
import { getUsedInTripsMap } from "@/lib/services/usedInTrips.service";
import { getParentNameMap, getParentName, getParentPhotoMap, getParentPhoto, getChildCountMap } from "@/lib/services/nestedAttractions.service";

export const OPTIONS = corsPreflight;

export const GET = withApiHandler("GET /api/attractions", async (req: Request) => {
  const { searchParams } = new URL(req.url);

  // Optional auth — used to determine which private-trip attractions are visible
  let userId: string | null = null;
  try { userId = getUserFromRequest(req).userId; } catch { /* unauthenticated */ }

  const skipParam = searchParams.get("skip");
  const limitParam = searchParams.get("limit");

  const { items, total, skip, limit } = await searchAttractions(userId, {
    country: searchParams.get("country"),
    city: searchParams.get("city"),
    q: searchParams.get("q"),
    type: searchParams.get("type"),
    ownerId: searchParams.get("ownerId"),
    parentAttractionId: searchParams.get("parentAttractionId"),
    skip: skipParam ? Number(skipParam) : null,
    limit: limitParam ? Number(limitParam) : null,
    includeHidden: searchParams.get("includeHidden") === "true",
  });

  const visitedIds = await getVisitedIdSet(userId);
  const usedInTripsMap = await getUsedInTripsMap(userId);
  const parentNameMap = await getParentNameMap(items.map((doc) => doc.parentAttractionId?.toString()));
  const parentPhotoMap = await getParentPhotoMap(items.map((doc) => doc.parentAttractionId?.toString()));
  const childCountMap = await getChildCountMap(items.map((doc) => doc._id.toString()));

  // Response body stays a plain array for backward compatibility with existing callers
  // (src/services/attractions.service.ts) — pagination metadata rides on headers so
  // clients can adopt "load more" incrementally without a breaking body-shape change.
  return NextResponse.json(items.map((doc) => formatAttraction(
    doc, null, undefined, visitedIds.has(doc._id.toString()), usedInTripsMap.get(doc._id.toString()),
    doc.parentAttractionId ? parentNameMap.get(doc.parentAttractionId.toString()) : undefined,
    childCountMap.get(doc._id.toString()),
    doc.parentAttractionId ? parentPhotoMap.get(doc.parentAttractionId.toString()) : undefined
  )), {
    headers: {
      "X-Total-Count": String(total),
      "X-Skip": String(skip),
      "X-Limit": String(limit),
    },
  });
});

export const POST = withApiHandler("POST /api/attractions", async (req: Request) => {
  const payload = getUserFromRequest(req);
  const body = await req.json();

  const attraction = await createAttraction(payload, body);
  // Brand new — childAttractionCount is always 0 (nothing could reference it yet).
  const parentAttractionName = await getParentName(attraction.parentAttractionId?.toString());
  const parentAttractionPhotoUrl = await getParentPhoto(attraction.parentAttractionId?.toString());
  return NextResponse.json(formatAttraction(attraction, null, undefined, false, [], parentAttractionName, 0, parentAttractionPhotoUrl), { status: 201 });
});
