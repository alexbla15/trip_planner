export interface PrivateChipProps {
  className?: string;
  /** "sm" (default) — pale/inline style for use on a plain surface next to other
   *  text or chips (e.g. a list row). "lg" — a bold, high-contrast badge for a
   *  small image overlay (trip card cover). "xl" — same treatment scaled up
   *  further for a large hero image, where "lg" reads too small. */
  size?: "sm" | "lg" | "xl";
}
