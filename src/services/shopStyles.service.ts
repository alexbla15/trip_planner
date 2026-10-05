import { parseOrThrow } from "./http";

export async function fetchShopStyles(): Promise<unknown[]> {
  const res = await fetch("/api/shop-styles");
  return parseOrThrow<unknown[]>(res);
}

export async function createShopStyle(token: string, payload: unknown): Promise<unknown> {
  const res = await fetch("/api/shop-styles", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return parseOrThrow<unknown>(res);
}

export async function updateShopStyle(id: string, token: string, payload: unknown): Promise<unknown> {
  const res = await fetch(`/api/shop-styles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return parseOrThrow<unknown>(res);
}

// Kept as a raw Response: the caller (AdminClient's handleShopStyleDelete) never
// checks ok — it always invalidates the cache and reloads regardless of outcome.
export function deleteShopStyle(id: string, token: string): Promise<Response> {
  return fetch(`/api/shop-styles/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
