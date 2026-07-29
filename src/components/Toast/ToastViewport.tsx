"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Toast } from "./Toast";
import styles from "./Toast.module.css";
import type { ToastViewportProps } from "./Toast.types";

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || toasts.length === 0) return null;

  return createPortal(
    <div className={styles.viewport} aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}
