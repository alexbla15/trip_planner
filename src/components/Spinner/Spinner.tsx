"use client";

import { Loader2 } from "lucide-react";
import type { SpinnerProps, SpinnerRingSize } from "./Spinner.types";
import styles from "./Spinner.module.css";

const RING_SIZE_CLASS: Record<SpinnerRingSize, string> = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
};

/**
 * Shared loading indicator used across the app instead of each screen
 * re-implementing its own spinner markup. Two variants: "ring" for
 * full-area/page loading states, "icon" for inline button/label spinners.
 */
export function Spinner({
  variant = "ring",
  size = "md",
  iconSize = 14,
  centered = false,
  className,
  "aria-label": ariaLabel,
}: SpinnerProps) {
  if (variant === "icon") {
    return <Loader2 size={iconSize} className={`${styles.icon} ${className ?? ""}`} aria-hidden="true" />;
  }

  return (
    <div
      className={`${styles.ring} ${RING_SIZE_CLASS[size]} ${centered ? styles.centered : ""} ${className ?? ""}`}
      role={ariaLabel ? "status" : undefined}
      aria-label={ariaLabel}
    />
  );
}
