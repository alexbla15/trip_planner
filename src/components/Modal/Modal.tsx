"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useModalController } from "./Modal.utils";
import type { ModalShellProps } from "./Modal.types";

/**
 * Shared dialog shell — backdrop, focus-trapped panel, header row with a
 * close button, scrollable body, and an optional footer — used by every
 * modal in the app. Callers keep their own CSS module and their own
 * header/body/footer markup; this component only centralizes the portal +
 * accessibility behavior and the wrapping DOM structure, so no modal's
 * visual output changes by adopting it.
 */
export function ModalShell({
  isOpen,
  onClose,
  styles,
  header,
  beforeBody,
  children,
  footer,
  headingId,
  ariaLabel,
  initialFocusRef,
}: ModalShellProps) {
  const { mounted, dialogRef, handleBackdropClick } = useModalController({ isOpen, onClose, initialFocusRef });

  if (!mounted || !isOpen) return null;

  const modal = (
    <div className={styles.backdrop} onClick={handleBackdropClick} aria-hidden="true">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-label={ariaLabel}
        tabIndex={-1}
        className={styles.container}
        aria-hidden="false"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          {header}
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {beforeBody}

        <div className={styles.body}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
