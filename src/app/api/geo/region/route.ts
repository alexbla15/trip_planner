import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/withApiHandler";
import { corsPreflight } from "@/lib/cors";
import { getCachedBoundary, setCachedBoundary } from "@/lib/geoBoundaryCache";
import { queueNominatimFetch } from "@/lib/nominatimThrottle";

export const OPTIONS = corsPreflight;

type GeoFeature = {
  type: string;
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown>;
};

type FeatureCollection = { type: string; features: GeoFeature[] };

async function searchNominatim(q: string): Promise<FeatureCollection | null> {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(q)}&format=geojson&polygon_geojson=1&limit=5`;

  const res = await queueNominatimFetch(url, {
    headers: { "User-Agent": "TripPlanner/1.0 (educational project)" },
    next: { revalidate: 86400 },
  });

  // A non-OK response (e.g. Nominatim's 429 rate limit) is a transient failure,
  // not "this region has no boundary" — the caller must not cache it.
  if (!res.ok) return null;
  return (await res.json()) as FeatureCollection;
}

function firstPolygon(data: FeatureCollection | null): GeoFeature | null {
  return (
    data?.features?.find(
      (f) => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon"
    ) ?? null
  );
}

// A `region` on an attraction is a free-text grouping label (see `Attraction.region`),
// not a fixed administrative unit — some resolve cleanly to a real Nominatim place
// (e.g. "Black Forest", "US-NY" as a US state code, "Lake Garda"), others are invented
// composite labels that won't resolve to anything (e.g. "Kazbegi / Georgian Military
// Highway"). Same graceful-degradation contract as /api/geo/city: a genuine "no polygon
// found" result is cached and returned as null, and the map falls back to a plain circle
// around the region's centroid — never an error.
export const GET = withApiHandler("GET /api/geo/region", async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const region  = searchParams.get("name")?.trim();
  const country = searchParams.get("country")?.trim();
  if (!region) return NextResponse.json(null);

  const cacheKey = `region:${region}|${country ?? ""}`;
  const cached = await getCachedBoundary(cacheKey);
  if (cached.hit) return NextResponse.json(cached.data);

  try {
    const scopedData = country ? await searchNominatim(`${region}, ${country}`) : null;
    if (country && !scopedData) return NextResponse.json(null); // transient — don't cache
    let polygon = firstPolygon(scopedData);

    // Some region names (e.g. a US state code, or a composite label with a comma) resolve
    // better without the country suffix — retry bare before giving up.
    if (!polygon) {
      const bareData = await searchNominatim(region);
      if (!bareData) return NextResponse.json(null); // transient — don't cache
      polygon = firstPolygon(bareData);
    }

    // A genuinely empty/no-polygon result (both attempts exhausted) from successful
    // Nominatim responses IS safe to cache — a real, stable answer.
    await setCachedBoundary(cacheKey, polygon);
    return NextResponse.json(polygon);
  } catch {
    return NextResponse.json(null);
  }
});
