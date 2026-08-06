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

async function searchNominatim(q: string, addressdetails = false): Promise<FeatureCollection | null> {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(q)}&format=geojson&polygon_geojson=1&limit=5` +
    (addressdetails ? "&addressdetails=1" : "");

  const res = await queueNominatimFetch(url, {
    headers: { "User-Agent": "TripPlanner/1.0 (educational project)" },
    next: { revalidate: 3600 },
  });

  // A non-OK response (e.g. Nominatim's 429 rate limit) is a transient failure,
  // not "this place has no boundary" — the caller must not cache it.
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

export const GET = withApiHandler("GET /api/geo/city", async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const city    = searchParams.get("name")?.trim();
  const country = searchParams.get("country")?.trim();
  if (!city) return NextResponse.json(null);

  const cacheKey = `city:${city}|${country ?? ""}`;
  const cached = await getCachedBoundary(cacheKey);
  if (cached.hit) return NextResponse.json(cached.data);

  try {
    const q = country ? `${city}, ${country}` : city;
    const data = await searchNominatim(q, true);
    if (!data) return NextResponse.json(null); // transient failure — don't cache

    let polygon = firstPolygon(data);

    // Many small towns (common in Iceland/Georgia) are only mapped as a single
    // Point in OSM, with no administrative boundary way/relation of their own.
    // Fall back to the enclosing municipality's boundary (from the town's own
    // address breakdown) rather than leaving the map with just a pin — flagged
    // via `isFallbackBoundary` so the UI can render it distinctly from a real
    // town-level shape.
    if (!polygon && country) {
      const address = data.features?.[0]?.properties?.address as Record<string, string> | undefined;
      const fallbackArea = address?.county ?? address?.state_district ?? address?.state;
      if (fallbackArea && fallbackArea !== city) {
        const fallbackData = await searchNominatim(`${fallbackArea}, ${country}`);
        if (!fallbackData) return NextResponse.json(null); // transient — don't cache
        const fallbackPolygon = firstPolygon(fallbackData);
        if (fallbackPolygon) {
          polygon = {
            ...fallbackPolygon,
            properties: { ...fallbackPolygon.properties, isFallbackBoundary: true, fallbackLabel: fallbackArea },
          };
        }
      }
    }

    // A genuinely empty/no-polygon result (town and fallback area both exhausted)
    // from successful Nominatim responses IS safe to cache — a real, stable answer.
    await setCachedBoundary(cacheKey, polygon);
    return NextResponse.json(polygon);
  } catch {
    return NextResponse.json(null);
  }
});
