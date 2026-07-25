"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import type { RouteErrorProps } from "./RouteError.types";
import styles from "./RouteError.module.css";

/** Shared route-segment error boundary UI, rendered by every route's `error.tsx`. */
export function RouteError({ error, reset, title = "Something went wrong" }: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={styles.wrapper} role="alert">
      <AlertTriangle size={36} className={styles.icon} aria-hidden="true" />
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button type="button" className={styles.retryBtn} onClick={reset}>
        <RotateCw size={15} aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}
