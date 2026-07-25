/** Props for the dialog that lists attractions belonging to one attraction type ("sub-category"). */
export interface CategoryAttractionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Attraction type name to list (e.g. "Restaurant") — matches CategoryDonutChart's sub-slice `_id`. */
  typeName: string;
  /** Scopes the list to one user's own attractions. Omit to list all attractions site-wide. */
  ownerId?: string;
  token?: string | null;
}
