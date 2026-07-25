import { parseOrThrow } from "./http";

export async function getFxRate(from: string, to: string): Promise<{ rate?: number }> {
  const res = await fetch(`/api/fx?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  return parseOrThrow<{ rate?: number }>(res);
}
