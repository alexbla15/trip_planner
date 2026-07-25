import type { ReactNode, RefObject } from "react";

/**
 * A modal's own CSS module, passed through to {@link ModalShell} so it can
 * render into that modal's exact classes (backdrop, container, header, body,
 * footer, closeBtn, …) without changing any modal's visual output. Matches
 * the shape Next.js infers for `*.module.css` imports.
 */
export interface ModalShellStyles {
  readonly [key: string]: string;
}

export interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  /** The consuming modal's own CSS module — preserves that modal's exact visual styling. */
  styles: ModalShellStyles;
  /** Full header content (icon + heading, and anything else) rendered left of the close button. */
  header: ReactNode;
  /** Content rendered between the header and the scrollable body, outside the scroll area (e.g. a pinned search/filter bar). */
  beforeBody?: ReactNode;
  /** Modal body content — rendered inside the scrollable body wrapper. */
  children: ReactNode;
  /** Optional footer/action-bar content. */
  footer?: ReactNode;
  /** Id of the heading element inside `header`, used for `aria-labelledby`. Provide this or `ariaLabel`. */
  headingId?: string;
  /** Accessible name for the dialog when `header` has no single heading element to reference. */
  ariaLabel?: string;
  /** Element to focus when the modal opens (e.g. the first form field). */
  initialFocusRef?: RefObject<HTMLElement | null>;
}
