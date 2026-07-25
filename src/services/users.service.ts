import { parseOrThrow } from "./http";
import type { UserProfile } from "@/contexts/AuthContext";

export async function getCurrentUser(token: string): Promise<UserProfile> {
  const res = await fetch("/api/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseOrThrow<UserProfile>(res);
}

export async function updateCurrentUser(
  token: string,
  patch: { name: string; avatarUrl?: string },
): Promise<unknown> {
  const res = await fetch("/api/users/me", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(patch),
  });
  return parseOrThrow<unknown>(res);
}

export async function changePassword(
  token: string,
  payload: { currentPassword: string; newPassword: string },
): Promise<unknown> {
  const res = await fetch("/api/users/me/password", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return parseOrThrow<unknown>(res);
}

export async function searchUsers(token: string, query: string): Promise<unknown[]> {
  const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseOrThrow<unknown[]>(res);
}
