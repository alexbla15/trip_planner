"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import styles from "./SectionCard.module.css";

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  className?: string;
  /** Renders the heading as a toggle button that expands/collapses the body. Default false. */
  collapsible?: boolean;
  /** Initial open state when `collapsible` is true. Default true — sections never start surprise-collapsed. */
  defaultOpen?: boolean;
  /** Optional muted count rendered after the title, e.g. "(12)". */
  headingCount?: number | string;
  /** Right-aligned controls (e.g. an "Add" button) rendered outside the toggle, so they stay clickable while collapsed. */
  actions?: ReactNode;
}

export function SectionCard({
  icon: Icon,
  title,
  children,
  className,
  collapsible = false,
  defaultOpen = true,
  headingCount,
  actions,
}: SectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  const headingContent = (
    <>
      <div className={styles.iconCircle}>
        <Icon size={18} aria-hidden="true" />
      </div>
      <h2 className={styles.heading}>
        {title}
        {headingCount !== undefined && <span className={styles.headingCount}> ({headingCount})</span>}
      </h2>
    </>
  );

  return (
    <div className={`${styles.card}${className ? ` ${className}` : ""}`}>
      <div className={styles.headingRow}>
        {collapsible ? (
          <button
            type="button"
            className={styles.headingToggle}
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen((v) => !v)}
          >
            {headingContent}
            <ChevronDown
              size={18}
              aria-hidden="true"
              className={`${styles.chevron}${open ? "" : ` ${styles.chevronCollapsed}`}`}
            />
          </button>
        ) : (
          headingContent
        )}
        {actions && <div className={styles.headingActions}>{actions}</div>}
      </div>

      {collapsible ? (
        <div className={`${styles.collapse}${open ? "" : ` ${styles.collapseClosed}`}`}>
          <div className={styles.collapseInner} id={bodyId}>
            {children}
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
