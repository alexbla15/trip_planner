import { parseOrThrow } from "./http";

/** Error-shape JSON body returned by trip API routes on failure. */
export interface TripErrorResponse {
  error?: string;
}

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

// Swaps everything scheduled on two days (dayA/dayB as "YYYY-MM-DD") — see
// swapTripDays in src/lib/services/trips.service.ts for the exact semantics.
export async function swapTripDays(tripId: string, token: string, dayA: string, dayB: string): Promise<void> {
  const res = await fetch(`/api/trips/${tripId}/swap-days`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ dayA, dayB }),
  });
  await parseOrThrow<unknown>(res);
}

export interface DayAlternative {
  id: string;
  day: string;
  name: string;
}

/** Creates a new alternative for `day`, copying whatever's currently live for that day,
 *  and activates it immediately (the response's `id` is what you'd pass to
 *  setDayAlternativeActive to switch back later). */
export async function createDayAlternative(tripId: string, token: string, day: string): Promise<DayAlternative> {
  const res = await fetch(`/api/trips/${tripId}/day-alternatives`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ day }),
  });
  return parseOrThrow<DayAlternative>(res);
}

export async function renameDayAlternative(tripId: string, token: string, altId: string, name: string): Promise<DayAlternative> {
  const res = await fetch(`/api/trips/${tripId}/day-alternatives/${altId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
  return parseOrThrow<DayAlternative>(res);
}

export async function deleteDayAlternative(tripId: string, token: string, altId: string): Promise<void> {
  const res = await fetch(`/api/trips/${tripId}/day-alternatives/${altId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  await parseOrThrow<unknown>(res);
}

/** Activating makes this alternative the live version of its day — what the calendar,
 *  map, costs, and alerts all resolve into; deactivating reverts that day to its main
 *  schedule. Either way, refetch the trip afterwards to see the change. */
export async function setDayAlternativeActive(tripId: string, token: string, altId: string, active: boolean): Promise<void> {
  const res = await fetch(`/api/trips/${tripId}/day-alternatives/${altId}/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ active }),
  });
  await parseOrThrow<unknown>(res);
}
