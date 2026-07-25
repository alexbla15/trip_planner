"use client";

import { AlertCircle } from "lucide-react";
import styles from "./FormErrorBanner.module.css";

export interface FormErrorBannerProps {
  /** Error message to announce. Nothing renders when this is falsy. */
  message: string | null | undefined;
}

/** Shared API-error banner shown at the top of a form (e.g. login/register) after a failed submit. */
export function FormErrorBanner({ message }: FormErrorBannerProps) {
  if (!message) return null;
  return (
    <div className={styles.errorBanner} role="alert" aria-live="assertive">
      <AlertCircle size={16} aria-hidden="true" />
      {message}
    </div>
  );
}
