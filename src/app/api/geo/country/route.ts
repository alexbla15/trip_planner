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

export const GET = withApiHandler("GET /api/geo/country", async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("name")?.trim();
  if (!country) return NextResponse.json(null);

  const cacheKey = `country:${country}`;
  const cached = await getCachedBoundary(cacheKey);
  if (cached.hit) return NextResponse.json(cached.data);

  try {
    // No `featureType=country` restriction here — some attractions store a US state
    // (e.g. "New York State") in this field rather than a nation, and Nominatim tags
    // states as featureType=state/admin_level=4, which that filter would exclude
    // outright, leaving state-level entries with no real boundary polygon ever.
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(country)}&format=geojson&polygon_geojson=1&limit=5`;

    const res = await queueNominatimFetch(url, {
      headers: { "User-Agent": "TripPlanner/1.0 (educational project)" },
      next: { revalidate: 86400 },
    });

    // A non-OK response (e.g. Nominatim's 429 rate limit) is a transient failure,
    // not "this country has no boundary" — don't persist it, so the next request
    // retries instead of being stuck with a permanently wrong cached null.
    if (!res.ok) return NextResponse.json(null);

    const data = (await res.json()) as FeatureCollection;
    const polygon =
      data.features?.find(
        (f) => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon"
      ) ?? null;

    // A genuinely empty/no-polygon result from a successful Nominatim response IS
    // safe to cache — that's a real, stable answer, not a transient failure.
    await setCachedBoundary(cacheKey, polygon);
    return NextResponse.json(polygon);
  } catch {
    return NextResponse.json(null);
  }
});
