import { parseOrThrow } from "./http";

export async function addCollaborator(tripId: string, token: string, email: string): Promise<unknown> {
  const res = await fetch(`/api/trips/${tripId}/collaborators`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email }),
  });
  return parseOrThrow<unknown>(res);
}

export async function removeCollaborator(
  tripId: string,
  userId: string,
  token: string,
): Promise<unknown> {
  const res = await fetch(`/api/trips/${tripId}/collaborators/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseOrThrow<unknown>(res);
}
