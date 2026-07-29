"use client";

import { Check, AlertCircle, X } from "lucide-react";
import styles from "./Toast.module.css";
import type { ToastProps } from "./Toast.types";

export function Toast({ toast, onDismiss }: ToastProps) {
  const isError = toast.variant === "error";
  const Icon = isError ? AlertCircle : Check;

  return (
    <div
      className={[
        styles.toast,
        isError ? styles.toastError : styles.toastSuccess,
        toast.leaving ? styles.toastLeaving : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role={isError ? "alert" : "status"}
    >
      <Icon size={20} className={styles.icon} aria-hidden="true" />
      <span className={styles.message}>{toast.message}</span>
      <button
        type="button"
        className={styles.dismissBtn}
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
