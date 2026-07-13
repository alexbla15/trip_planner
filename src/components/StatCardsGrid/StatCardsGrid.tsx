"use client";

import type { LucideIcon } from "lucide-react";
import styles from "./StatCardsGrid.module.css";

export interface StatCardItem {
  icon: LucideIcon;
  label: string;
  value: string | number;
  clickable?: boolean;
}

interface StatCardsGridProps {
  items: StatCardItem[];
  loading?: boolean;
  skeletonCount?: number;
  activeStat?: string | null;
  onStatClick?: (label: string) => void;
  panelId?: string;
}

export function StatCardsGrid({
  items,
  loading = false,
  skeletonCount = 5,
  activeStat,
  onStatClick,
  panelId,
}: StatCardsGridProps) {
  if (loading) {
    return (
      <div className={styles.grid} aria-busy="true">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className={styles.card} aria-hidden="true">
            <div className={`${styles.skeletonCircle} ${styles.shimmer}`} />
            <div className={`${styles.skeletonNumber} ${styles.shimmer}`} />
            <div className={`${styles.skeletonLabel} ${styles.shimmer}`} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {items.map(({ icon: Icon, label, value, clickable = true }) => {
        const isActive = activeStat === label;
        const displayValue = typeof value === "number" ? value.toLocaleString() : value;
        const isClickable = clickable && !!onStatClick;

        const inner = (
          <>
            <div className={styles.iconCircle}>
              <Icon size={18} aria-hidden="true" />
            </div>
            <span className={styles.value}>{displayValue}</span>
            <span className={styles.cardLabel}>{label}</span>
          </>
        );

        if (isClickable) {
          return (
            <button
              key={label}
              type="button"
              className={`${styles.card} ${styles.cardClickable} ${isActive ? styles.cardActive : ""}`}
              onClick={() => onStatClick!(label)}
              aria-pressed={isActive}
              aria-controls={panelId}
            >
              {inner}
            </button>
          );
        }

        return (
          <div key={label} className={styles.card}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
