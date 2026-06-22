"use client";

import { Plus } from "lucide-react";
import styles from "./NewTripCard.module.css";

export function NewTripCard() {
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
    }
  }

  return (
    <div
      className={styles.card}
      role="button"
      tabIndex={0}
      aria-label="Plan a new adventure"
      onKeyDown={handleKeyDown}
    >
      <Plus size={48} className={styles.icon} aria-hidden="true" />
      <span className={styles.label}>Plan a new adventure</span>
    </div>
  );
}
