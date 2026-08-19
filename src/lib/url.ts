/** Empty string is valid (field is optional/clearable) — only rejects a non-empty,
 *  malformed value. Shared by any optional URL field (website links, cover photos). */
export function isValidUrl(url: string): boolean {
  if (!url.trim()) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
