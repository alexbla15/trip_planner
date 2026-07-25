"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

interface UseModalControllerParams {
  isOpen: boolean;
  onClose: () => void;
  /** Element to focus when the modal opens; defaults to the dialog itself if omitted. */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Shared modal accessibility behavior, extracted so every modal in the app
 * gets identical keyboard/a11y handling instead of re-implementing it per
 * component: SSR-safe portal mounting, initial focus + focus restore on the
 * trigger element, Escape-to-close, Tab focus-trapping inside the dialog,
 * and body scroll lock while open.
 */
export function useModalController({ isOpen, onClose, initialFocusRef }: UseModalControllerParams) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => (initialFocusRef?.current ?? dialogRef.current)?.focus());
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      triggerRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
    // initialFocusRef intentionally omitted — only re-run when open state changes, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return { mounted, dialogRef, handleBackdropClick };
}
