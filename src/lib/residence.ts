/** Nights between check-in and check-out (exclusive of check-out day) — distinct from
 *  the shared `getDurationDays` helper, which is inclusive and meant for a single-day
 *  attraction's "duration in days" framing, not a hotel stay's "nights" framing. Shared
 *  between every surface that displays a residence (trip's ResidencesList, Explore's
 *  AttractionGridCard, AttractionDetailModal). */
export function getNightsCount(checkInDate?: string, checkOutDate?: string): number | null {
  if (!checkInDate || !checkOutDate) return null;
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  const nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return nights >= 0 ? nights : null;
}
