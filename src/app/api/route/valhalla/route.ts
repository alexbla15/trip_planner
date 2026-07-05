import { NextResponse } from "next/server";

// Proxies walk/car routing to OSRM public demo — server-to-server avoids CORS.
// Valhalla's public instance (valhalla1.openstreetmap.de) is unreliable; OSRM is stable.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fromLat = searchParams.get("fromLat");
  const fromLng = searchParams.get("fromLng");
  const toLat   = searchParams.get("toLat");
  const toLng   = searchParams.get("toLng");
  const mode    = searchParams.get("mode"); // "walk" | "car"

  if (!fromLat || !fromLng || !toLat || !toLng || !mode) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const profile = mode === "car" ? "driving" : "foot";
  const coords  = `${fromLng},${fromLat};${toLng},${toLat}`;
  const url     = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson`;

  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);

    const upstream = await fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
    const data     = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "Routing service unavailable" }, { status: 503 });
  }
}
