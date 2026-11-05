import { parseOrThrow } from "./http";

export async function fetchFoodStyles(): Promise<unknown[]> {
  const res = await fetch("/api/food-styles");
  return parseOrThrow<unknown[]>(res);
}

export async function createFoodStyle(token: string, payload: unknown): Promise<unknown> {
  const res = await fetch("/api/food-styles", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return parseOrThrow<unknown>(res);
}

export async function updateFoodStyle(id: string, token: string, payload: unknown): Promise<unknown> {
  const res = await fetch(`/api/food-styles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return parseOrThrow<unknown>(res);
}

// Kept as a raw Response so the caller can branch on a 409 IN_USE conflict (see the
// `force` flag below) before deciding whether to retry with force.
export function deleteFoodStyle(id: string, token: string, force = false): Promise<Response> {
  return fetch(`/api/food-styles/${id}${force ? "?force=true" : ""}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
