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
  const country = searchParams.get("name")?.trim();
  if (!country) return NextResponse.json(null);

  if (cache.has(country)) return NextResponse.json(cache.get(country) ?? null);

  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(country)}&format=geojson&polygon_geojson=1&limit=5`;

    const res = await fetch(url, {
      headers: { "User-Agent": "TripPlanner/1.0 (educational project)" },
      next: { revalidate: 86400 },
    });

    if (!res.ok) { cache.set(country, null); return NextResponse.json(null); }

    const data = (await res.json()) as FeatureCollection;
    const polygon =
      data.features?.find(
        (f) => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon"
      ) ?? null;

    cache.set(country, polygon);
    return NextResponse.json(polygon);
  } catch {
    cache.set(country, null);
    return NextResponse.json(null);
  }
}
