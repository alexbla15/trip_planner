import { parseOrThrow } from "./http";

// token is optional (works for anonymous visitors) but must be sent when present —
// otherwise the server can't compute per-city visitedCount/unvisitedCount for the caller.
export async function getCities(token?: string | null): Promise<unknown> {
  const res = await fetch("/api/attractions/cities", {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return parseOrThrow<unknown>(res);
}

export async function getExploreItems(): Promise<unknown[]> {
  const res = await fetch("/api/explore");
  return parseOrThrow<unknown[]>(res);
}

// includeHidden=true: Explore is a public discovery view over shared place data, not
// trip-planning details — it should never hide an attraction just because the only
// trip referencing it happens to be private (see src/lib/services/attractions.service.ts).
// token is optional (Explore works for anonymous visitors) but must be sent when present —
// otherwise the server treats the caller as anonymous and every result's isVisited comes
// back false regardless of what's actually saved, even for a logged-in user.
export async function getAttractionsByCity(city: string, token?: string | null): Promise<unknown[]> {
  const res = await fetch(`/api/attractions?city=${encodeURIComponent(city)}&includeHidden=true`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return parseOrThrow<unknown[]>(res);
}

// A country-only search (no city, no type) is capped at 20 results per page server-side
// (see searchAttractions in src/lib/services/attractions.service.ts — deliberately low,
// tuned for a search-modal typeahead). A country-level map view needs every attraction,
// not just the first page, so this paginates through all of them using the X-Total-Count/
// X-Limit headers the route already returns.
export async function getAttractionsByCountry(country: string, token?: string | null): Promise<unknown[]> {
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const all: unknown[] = [];
  let skip = 0;
  for (;;) {
    const res = await fetch(
      `/api/attractions?country=${encodeURIComponent(country)}&includeHidden=true&skip=${skip}`,
      { headers }
    );
    const total = Number(res.headers.get("X-Total-Count") ?? "0");
    const limit = Number(res.headers.get("X-Limit") ?? "0") || 20;
    const page = await parseOrThrow<unknown[]>(res);
    all.push(...page);
    skip += limit;
    if (page.length === 0 || skip >= total) break;
  }
  return all;
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

export async function markAttractionVisited(attractionId: string, token: string): Promise<unknown> {
  const res = await fetch(`/api/users/me/visited/${attractionId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseOrThrow<unknown>(res);
}

export async function unmarkAttractionVisited(attractionId: string, token: string): Promise<unknown> {
  const res = await fetch(`/api/users/me/visited/${attractionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseOrThrow<unknown>(res);
}
