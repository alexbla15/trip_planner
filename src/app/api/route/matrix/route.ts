import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { ApiError, badRequest } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

// Proxies to OSRM's Table service — computes travel time from one origin to many
// destinations in a single upstream request, instead of one /route call per
// destination. Used by the nearby-attractions planner, which otherwise needs up
// to MAX_ROUTING_CANDIDATES individual routing calls per search.
export const GET = withApiHandler("GET /api/route/matrix", async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const originLat = searchParams.get("originLat");
  const originLng = searchParams.get("originLng");
  const destinations = searchParams.get("destinations"); // "lat,lng;lat,lng;..."
  const mode = searchParams.get("mode"); // "walk" | "car"

  if (!originLat || !originLng || !destinations || !mode) {
    throw badRequest("Missing params");
  }

  const destCoords = destinations
    .split(";")
    .filter(Boolean)
    .map((pair) => {
      const [lat, lng] = pair.split(",");
      return `${lng},${lat}`;
    });
  if (destCoords.length === 0) throw badRequest("No destinations");

  const coords = [`${originLng},${originLat}`, ...destCoords].join(";");
  const destIndices = destCoords.map((_, i) => i + 1).join(";");
  // Same per-profile OSRM instances as /api/route/valhalla — router.project-osrm.org
  // only hosts the driving profile, routing.openstreetmap.de runs both.
  const url = mode === "car"
    ? `https://routing.openstreetmap.de/routed-car/table/v1/driving/${coords}?sources=0&destinations=${destIndices}&annotations=duration`
    : `https://routing.openstreetmap.de/routed-foot/table/v1/foot/${coords}?sources=0&destinations=${destIndices}&annotations=duration`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);

  let upstream: Response;
  try {
    // FOSSGIS's usage policy (routing.openstreetmap.de) penalizes requests with no
    // descriptive User-Agent more heavily under its rate limiter — see /api/route/transit.
    upstream = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "TripPlanner/1.0 (+https://trip-planner-beta-dusky.vercel.app)" },
    });
  } catch {
    throw new ApiError(503, "Routing service unavailable", "SERVICE_UNAVAILABLE");
  } finally {
    clearTimeout(timer);
  }

  if (!upstream.ok) {
    throw new ApiError(upstream.status, "Routing service returned an error", "UPSTREAM_ERROR");
  }

  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
});
