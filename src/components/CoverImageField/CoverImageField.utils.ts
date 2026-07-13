export function isValidCoverUrl(url: string): boolean {
  if (!url) return true;
  try { new URL(url); return true; } catch { return false; }
}
