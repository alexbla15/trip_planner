import { parseOrThrow } from "./http";

export async function getPersonalAnalytics(token: string): Promise<unknown> {
  const res = await fetch("/api/analytics/summary", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseOrThrow<unknown>(res);
}

export async function getGlobalAnalytics(): Promise<unknown> {
  const res = await fetch("/api/analytics/global");
  return parseOrThrow<unknown>(res);
}
