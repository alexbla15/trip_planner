import { parseOrThrow } from "./http";

export async function fetchAttractionTypes(): Promise<unknown[]> {
  const res = await fetch("/api/attraction-types");
  return parseOrThrow<unknown[]>(res);
}

export async function createAttractionType(token: string, payload: unknown): Promise<unknown> {
  const res = await fetch("/api/attraction-types", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return parseOrThrow<unknown>(res);
}

export async function updateAttractionType(
  id: string,
  token: string,
  payload: unknown,
): Promise<unknown> {
  const res = await fetch(`/api/attraction-types/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return parseOrThrow<unknown>(res);
}

// Kept as a raw Response: the caller (AdminClient's handleDelete) never checks
// ok — it always invalidates the cache and reloads the page regardless of
// outcome; throwing here would newly block that reload on a failed delete.
export function deleteAttractionType(id: string, token: string): Promise<Response> {
  return fetch(`/api/attraction-types/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
