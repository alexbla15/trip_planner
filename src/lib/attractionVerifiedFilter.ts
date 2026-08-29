export type VerifiedFilterValue = "all" | "verified" | "unverified";

/** Shared predicate for the "Verified" chip row in AttractionFilter — every list that
 *  renders the filter applies this the same way. */
export function matchesVerifiedFilter(verified: boolean | undefined, filter: VerifiedFilterValue): boolean {
  if (filter === "verified") return !!verified;
  if (filter === "unverified") return !verified;
  return true;
}
