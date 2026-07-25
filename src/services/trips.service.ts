import { parseOrThrow } from "./http";

export async function listTrips(token: string): Promise<unknown[]> {
  const res = await fetch("/api/trips", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseOrThrow<unknown[]>(res);
}

export async function createTrip(
  token: string | null,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch("/api/trips", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return parseOrThrow<unknown>(res);
}

// Kept as a raw Response: TripDetailClient branches on 403 (forbidden) vs 404
// (redirect) vs success, while EditTripClient only branches on 404 vs success —
// callers need the status code, not just ok/not-ok.
export function getTrip(tripId: string, token?: string | null): Promise<Response> {
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  return fetch(`/api/trips/${tripId}`, { headers });
}

// Kept as a raw Response: callers handle failure very differently — EditTripClient
// always parses the body and shows its error message, TripSharingPanel rolls back
// optimistic state on failure, and CalendarSection fires-and-forgets ignoring the
// result entirely.
export function updateTrip(
  tripId: string,
  token: string,
  patch: Record<string, unknown>,
): Promise<Response> {
  return fetch(`/api/trips/${tripId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch),
  });
}

export async function deleteTrip(tripId: string, token: string): Promise<void> {
  const res = await fetch(`/api/trips/${tripId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  await parseOrThrow<unknown>(res);
}
