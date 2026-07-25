import { parseOrThrow } from "./http";

export async function reverseGeocode(lat: number, lng: number): Promise<unknown> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
    { headers: { "User-Agent": "TripPlannerApp/1.0" } },
  );
  return parseOrThrow<unknown>(res);
}

export async function searchLocation(query: string): Promise<unknown[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`,
    { headers: { "Accept-Language": "en" } },
  );
  return parseOrThrow<unknown[]>(res);
}
