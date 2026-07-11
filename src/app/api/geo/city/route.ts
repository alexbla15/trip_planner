import { NextResponse } from "next/server";

type GeoFeature = {
  type: string;
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown>;
};

type FeatureCollection = { type: string; features: GeoFeature[] };

const cache = new Map<string, GeoFeature | null>();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city    = searchParams.get("name")?.trim();
  const country = searchParams.get("country")?.trim();
  if (!city) return NextResponse.json(null);

  const cacheKey = `${city}||${country ?? ""}`;
  if (cache.has(cacheKey)) return NextResponse.json(cache.get(cacheKey) ?? null);

  try {
    const q = country ? `${city}, ${country}` : city;
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(q)}&format=geojson&polygon_geojson=1&limit=5`;

    const res = await fetch(url, {
      headers: { "User-Agent": "TripPlanner/1.0 (educational project)" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) { cache.set(cacheKey, null); return NextResponse.json(null); }

    const data = (await res.json()) as FeatureCollection;
    const polygon =
      data.features?.find(
        (f) => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon"
      ) ?? null;

    cache.set(cacheKey, polygon);
    return NextResponse.json(polygon);
  } catch {
    cache.set(cacheKey, null);
    return NextResponse.json(null);
  }
}
