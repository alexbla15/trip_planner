import { parseOrThrow } from "./http";

export async function getCities(): Promise<unknown> {
  const res = await fetch("/api/attractions/cities");
  return parseOrThrow<unknown>(res);
}

export async function getExploreItems(): Promise<unknown[]> {
  const res = await fetch("/api/explore");
  return parseOrThrow<unknown[]>(res);
}

// includeHidden=true: Explore is a public discovery view over shared place data, not
// trip-planning details — it should never hide an attraction just because the only
// trip referencing it happens to be private (see src/lib/services/attractions.service.ts).
export async function getAttractionsByCity(city: string): Promise<unknown[]> {
  const res = await fetch(`/api/attractions?city=${encodeURIComponent(city)}&includeHidden=true`);
  return parseOrThrow<unknown[]>(res);
}

export async function searchAttractionsByCountry(country: string, query: string, token?: string | null): Promise<unknown[]> {
  const params = new URLSearchParams({ country });
  if (query.trim()) params.set("q", query.trim());
  const res = await fetch(`/api/attractions?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return parseOrThrow<unknown[]>(res);
}

/** Lists attractions of a given attraction type. Pass `ownerId` to scope to one user's own attractions; omit for all. */
export async function searchAttractionsByType(type: string, ownerId?: string, token?: string | null): Promise<unknown[]> {
  const params = new URLSearchParams({ type });
  if (ownerId) params.set("ownerId", ownerId);
  const res = await fetch(`/api/attractions?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return parseOrThrow<unknown[]>(res);
}

export async function createAttraction(token: string, data: unknown): Promise<unknown> {
  const res = await fetch("/api/attractions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return parseOrThrow<unknown>(res);
}

export async function updateAttraction(id: string, token: string, data: unknown): Promise<unknown> {
  const res = await fetch(`/api/attractions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return parseOrThrow<unknown>(res);
}

export async function getTripAttractions(tripId: string, token?: string | null): Promise<unknown[]> {
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`/api/trips/${tripId}/attractions`, { headers });
  return parseOrThrow<unknown[]>(res);
}

export async function addAttractionToTrip(
  tripId: string,
  token: string,
  payload: unknown,
): Promise<unknown> {
  const res = await fetch(`/api/trips/${tripId}/attractions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return parseOrThrow<unknown>(res);
}

// Kept as a raw Response: handleFlightUpdate needs to fall back to reading the
// sibling attraction-update response's body when this schedule PATCH fails,
// CalendarSection's putOne throws its own status-coded error, and
// handleCustomSlotUpdate silently no-ops on failure — three different shapes.
export function updateTripAttractionSchedule(
  tripId: string,
  attractionId: string,
  token: string,
  patch: unknown,
): Promise<Response> {
  return fetch(`/api/trips/${tripId}/attractions/${attractionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch),
  });
}

// Kept as a raw Response: TripDetailClient checks ok to decide whether to roll
// back optimistic local state, while CalendarSection's custom-slot delete never
// checks status at all (removes locally regardless of server outcome) — throwing
// on failure there would change its behavior.
export function removeAttractionFromTrip(
  tripId: string,
  attractionId: string,
  token: string | null,
): Promise<Response> {
  return fetch(`/api/trips/${tripId}/attractions/${attractionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
}
