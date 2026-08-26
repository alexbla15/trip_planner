import type { Attraction } from "@/types/attraction";

export interface AttractionGridCardProps {
  attraction: Attraction;
  onClick: (attraction: Attraction) => void;
  /** Current viewer's user id — compared against `attraction.ownerId` to decide
   *  whether the edit/delete actions are shown. Omit for anonymous viewers. */
  currentUserId?: string;
  /** Auth token, forwarded when fetching children on the child-count badge expansion.
   *  Optional — omitting it still fetches children, just as an anonymous caller. */
  token?: string | null;
  /** Shown whenever provided (typically gated by the caller on being logged in). */
  onAddToTrip?: (attraction: Attraction) => void;
  /** Shown only when `currentUserId` matches `attraction.ownerId`. */
  onEdit?: (attraction: Attraction) => void;
  /** Shown only when `currentUserId` matches `attraction.ownerId`. */
  onDelete?: (attraction: Attraction) => void;
}
