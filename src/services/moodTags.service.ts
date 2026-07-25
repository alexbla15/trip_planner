import { parseOrThrow } from "./http";

export async function fetchMoodTags(): Promise<unknown[]> {
  const res = await fetch("/api/mood-tags");
  return parseOrThrow<unknown[]>(res);
}

export async function createMoodTag(token: string, payload: unknown): Promise<unknown> {
  const res = await fetch("/api/mood-tags", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return parseOrThrow<unknown>(res);
}

export async function updateMoodTag(id: string, token: string, payload: unknown): Promise<unknown> {
  const res = await fetch(`/api/mood-tags/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return parseOrThrow<unknown>(res);
}

// Kept as a raw Response: the caller (AdminClient's handleMoodDelete) never
// checks ok — it always invalidates the cache and reloads regardless of outcome.
export function deleteMoodTag(id: string, token: string): Promise<Response> {
  return fetch(`/api/mood-tags/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Kept as a raw Response: the caller (handleSeedMoodTags) never checks ok either
// — always invalidates the cache and reloads regardless of outcome.
export function seedMoodTags(token: string): Promise<Response> {
  return fetch("/api/mood-tags/seed", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}
