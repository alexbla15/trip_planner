import type { Attraction } from "@/types/attraction";

export interface NearbyAttractionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  /** This trip's own regular attractions (deduped, no flights/residences) — used to
   *  exclude already-added attractions from nearby-search results. Always the FULL
   *  trip list, independent of any Explore tab filters, so a filtered-out attraction
   *  can't be suggested as "nearby" and re-added as a duplicate. */
  tripAttractions: Attraction[];
  /** Candidates offered in the origin picker (step 1) — normally the same attractions
   *  currently visible on the Explore tab (post day/category/type filters), so picking
   *  an origin only offers what the user is actually looking at. */
  originAttractions: Attraction[];
  token: string;
  /** Called after a suggestion is successfully added to the trip, so the parent can
   *  merge it into its own attraction list the same way every other add-flow does. */
  onAttractionAdded: (created: Attraction) => void;
  /** Called when a result row is clicked — parent opens its existing AttractionDetailModal,
   *  same as clicking a map marker on the Explore tab. Optional so the modal still works
   *  standalone if a caller doesn't wire up a detail view. */
  onViewAttraction?: (attraction: Attraction) => void;
}

export interface NearbySuggestion {
  attraction: Attraction;
  durationSec: number;
}

export type NearbyStep = "pick" | "results";
