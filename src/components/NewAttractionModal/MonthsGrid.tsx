"use client";

import { MONTH_LABELS } from "./attraction.constants";
import styles from "./MonthsGrid.module.css";

interface MonthsGridProps {
  value: number[];
  onChange: (months: number[]) => void;
}

export function MonthsGrid({ value, onChange }: MonthsGridProps) {
  function toggleMonth(month: number) {
    onChange(
      value.includes(month)
        ? value.filter((m) => m !== month)
        : [...value, month].sort((a, b) => a - b)
    );
  }

  return (
    <div className={styles.grid} role="group" aria-label="Opening months">
      {MONTH_LABELS.map(({ value: month, label }) => {
        const selected = value.includes(month);
        return (
          <button
            key={month}
            type="button"
            role="checkbox"
            aria-checked={selected}
            className={`${styles.chip} ${selected ? styles.chipSelected : ""}`}
            onClick={() => toggleMonth(month)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
