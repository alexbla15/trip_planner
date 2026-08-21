import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { ApiError, badRequest } from "@/lib/apiError";

export const OPTIONS = corsPreflight;

// Proxies walk/car routing to OSRM public demo — server-to-server avoids CORS.
// Valhalla's public instance (valhalla1.openstreetmap.de) is unreliable; OSRM is stable.
export const GET = withApiHandler("GET /api/route/valhalla", async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const fromLat = searchParams.get("fromLat");
  const fromLng = searchParams.get("fromLng");
  const toLat   = searchParams.get("toLat");
  const toLng   = searchParams.get("toLng");
  const mode    = searchParams.get("mode"); // "walk" | "car"

  if (!fromLat || !fromLng || !toLat || !toLng || !mode) {
    throw badRequest("Missing params");
  }

  // router.project-osrm.org only hosts the driving profile.
  // routing.openstreetmap.de runs separate per-profile instances for the OSM routing demo.
  const coords = `${fromLng},${fromLat};${toLng},${toLat}`;
  const url = mode === "car"
    ? `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coords}?overview=full&geometries=geojson`
    : `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coords}?overview=full&geometries=geojson`;

  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

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
