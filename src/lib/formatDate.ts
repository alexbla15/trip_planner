/**
 * Formats an ISO date string (e.g. "2025-07-15T00:00:00.000Z" or "2025-07-15")
 * to a human-readable string like "Jul 15, 2025". Forces UTC so the date
 * never shifts due to the viewer's local timezone.
 */
export function formatDisplayDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return isoString;
  }
}
