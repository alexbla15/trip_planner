import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { formatAttraction } from "@/models/Attraction";
import { getNearbyAttractions } from "@/lib/services/attractions.service";
import { getVisitedIdSet } from "@/lib/services/visited.service";
import { getUsedInTripsMap } from "@/lib/services/usedInTrips.service";
import { getParentNameMap, getParentPhotoMap, getChildCountMap } from "@/lib/services/nestedAttractions.service";
import { getBrandMap } from "@/lib/services/brands.service";

export const OPTIONS = corsPreflight;

type Params = { params: Promise<{ id: string }> };

/** Public — attractions within `radiusKm` (default/cap 2km) of the given attraction's own
 *  coordinates, closest first. Powers the detail card's on-demand "Nearby" section; never
 *  called until the user explicitly asks, so this extra query never runs on a normal
 *  page/card load. */
export const GET = withApiHandler("GET /api/attractions/[id]/nearby", async (req: Request, { params }: Params) => {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const radiusKm = Math.min(Math.max(Number(searchParams.get("radiusKm")) || 2, 0.1), 2);

  let userId: string | null = null;
  try { userId = getUserFromRequest(req).userId; } catch { /* unauthenticated */ }

  const results = await getNearbyAttractions(id, userId, radiusKm);
  const items = results.map((r) => r.attraction);

  const visitedIds = await getVisitedIdSet(userId);
  const usedInTripsMap = await getUsedInTripsMap(userId);
  const parentNameMap = await getParentNameMap(items.map((doc) => doc.parentAttractionId?.toString()));
  const parentPhotoMap = await getParentPhotoMap(items.map((doc) => doc.parentAttractionId?.toString()));
  const childCountMap = await getChildCountMap(items.map((doc) => doc._id.toString()));
  const brandMap = await getBrandMap(items.map((doc) => doc.brandId?.toString()));

  const payload = results.map(({ attraction: doc, distanceKm }) => ({
    ...formatAttraction(
      doc, null, undefined, visitedIds.has(doc._id.toString()), usedInTripsMap.get(doc._id.toString()),
      doc.parentAttractionId ? parentNameMap.get(doc.parentAttractionId.toString()) : undefined,
      childCountMap.get(doc._id.toString()),
      doc.parentAttractionId ? parentPhotoMap.get(doc.parentAttractionId.toString()) : undefined,
      doc.brandId ? brandMap.get(doc.brandId.toString()) : undefined
    ),
    distanceKm: Math.round(distanceKm * 1000) / 1000,
  }));

  return NextResponse.json(payload);
});
