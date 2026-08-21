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
}

export interface NearbySuggestion {
  attraction: Attraction;
  durationSec: number;
}

export type NearbyStep = "pick" | "results";
