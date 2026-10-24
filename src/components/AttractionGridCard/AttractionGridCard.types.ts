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
  /** Called when the brand linked to this attraction (shown via the Store badge) is
   *  deleted from the BrandModal opened here — callers holding their own copy of this
   *  attraction (e.g. Explore's city/country/world lists) should clear brandId/brandName
   *  on every attraction that shared it, or the badge stays stuck showing a brand that no
   *  longer exists until a full refetch. */
  onBrandDeleted?: (brandId: string) => void;
}
