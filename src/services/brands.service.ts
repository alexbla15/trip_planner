import { parseOrThrow } from "./http";

export async function fetchBrands(): Promise<unknown[]> {
  const res = await fetch("/api/brands");
  return parseOrThrow<unknown[]>(res);
}

export async function createBrand(token: string, payload: unknown): Promise<unknown> {
  const res = await fetch("/api/brands", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return parseOrThrow<unknown>(res);
}

export async function updateBrand(id: string, token: string, payload: unknown): Promise<unknown> {
  const res = await fetch(`/api/brands/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return parseOrThrow<unknown>(res);
}

// Kept as a raw Response, same convention as deleteFoodStyle/deleteShopStyle — the caller
// always invalidates the cache and reloads regardless of outcome.
export function deleteBrand(id: string, token: string): Promise<Response> {
  return fetch(`/api/brands/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchStaleBrandCopies(token: string): Promise<number> {
  const res = await fetch("/api/brands/stale-copies", { headers: { Authorization: `Bearer ${token}` } });
  const data = await parseOrThrow<{ count: number }>(res);
  return data.count;
}

export async function clearStaleBrandCopies(token: string): Promise<number> {
  const res = await fetch("/api/brands/stale-copies", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseOrThrow<{ cleared: number }>(res);
  return data.cleared;
}
