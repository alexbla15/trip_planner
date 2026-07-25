import { parseOrThrow } from "./http";

export async function fetchAttractionCategories(): Promise<unknown[]> {
  const res = await fetch("/api/attraction-categories");
  return parseOrThrow<unknown[]>(res);
}

export async function createAttractionCategory(token: string, payload: unknown): Promise<unknown> {
  const res = await fetch("/api/attraction-categories", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return parseOrThrow<unknown>(res);
}

export async function updateAttractionCategory(
  id: string,
  token: string,
  payload: unknown,
): Promise<unknown> {
  const res = await fetch(`/api/attraction-categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return parseOrThrow<unknown>(res);
}

export async function deleteAttractionCategory(id: string, token: string): Promise<void> {
  const res = await fetch(`/api/attraction-categories/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  await parseOrThrow<unknown>(res);
}

// Kept as a raw Response: the caller (AdminClient's handleMigrate) always reads
// the response body's "message" field to display, with no try/catch around the
// call at all — converting to throw-on-failure would risk an unhandled rejection.
export function migrateLegacyTypes(token: string): Promise<Response> {
  return fetch("/api/attraction-categories/seed-from-types", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}
