export interface WebsiteLinkButtonProps {
  /** Renders nothing when this is falsy/empty — callers don't need their own conditional. */
  url: string | null | undefined;
  /** "full" (icon + "Website" label, pill) for surfaces with room for a label — the
   *  default. "compact" (icon-only, 32px circle) for dense rows/popups. */
  variant?: "full" | "compact";
  /** Optional extra class for the anchor — lets a specific surface (e.g. a modal header
   *  that already has its own 36px icon-button family) adjust sizing to match its
   *  siblings without forking the component. */
  className?: string;
}
