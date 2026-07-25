import type { Attraction } from "@/types/attraction";

/** Props for the modal that searches existing attractions in a country and lets the user add one to the trip, or fall through to creating a new one. */
export interface AttractionSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  country: string;
  onAdd: (attraction: Attraction) => void;
  onCreateNew: () => void;
  /** Caller's auth token — forwarded to the search request so private-trip attractions the user can access aren't hidden. */
  token?: string | null;
}
