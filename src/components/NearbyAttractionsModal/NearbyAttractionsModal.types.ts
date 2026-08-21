import type { Attraction } from "@/types/attraction";

export interface NearbyAttractionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  /** This trip's own regular attractions (deduped, no flights/residences) — the
   *  origin-picker list, and also used to exclude already-added attractions from results. */
  tripAttractions: Attraction[];
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
