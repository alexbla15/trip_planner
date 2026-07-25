export type SpinnerVariant = "ring" | "icon";
export type SpinnerRingSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  /** "ring" (default) renders a standalone CSS ring for full-area loading states (map overlays, dynamic-import fallbacks). "icon" renders an inline Loader2 icon for buttons/labels (e.g. "Saving…"). */
  variant?: SpinnerVariant;
  /** Ring diameter — ring variant only. Defaults to "md" (32px). */
  size?: SpinnerRingSize;
  /** Icon pixel size — icon variant only, passed straight to the underlying lucide icon. Defaults to 14. */
  iconSize?: number;
  /** Adds top margin to center the ring under a panel header, matching the original full-panel loading placement. */
  centered?: boolean;
  className?: string;
  /** Accessible label — ring variant only. Omit when a surrounding element already announces the loading state. */
  "aria-label"?: string;
}
