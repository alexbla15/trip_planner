"use client";

import type { ChangeEvent } from "react";
import styles from "./SeasonalRangePicker.module.css";

export interface MonthDay {
  month: number; // 1–12
  day: number;   // 1–31
}

interface SeasonalRangePickerProps {
  start: MonthDay | null;
  end: MonthDay | null;
  onChange: (start: MonthDay | null, end: MonthDay | null) => void;
}

// <input type="date"> requires a full date — a fixed leap year lets Feb 29 be picked
// as a valid endpoint. The year itself is never read or stored; only month/day survive.
const DUMMY_YEAR = 2000;

function monthDayToDateValue(md: MonthDay | null): string {
  if (!md) return "";
  return `${DUMMY_YEAR}-${String(md.month).padStart(2, "0")}-${String(md.day).padStart(2, "0")}`;
}

function dateValueToMonthDay(value: string): MonthDay | null {
  if (!value) return null;
  const [, month, day] = value.split("-").map(Number);
  return { month, day };
}

/** Precise start/end date-range picker (month/day only, no year — recurs annually). Used
 *  to scope a seasonal opening-hours override to a specific part of the year. */
export function SeasonalRangePicker({ start, end, onChange }: SeasonalRangePickerProps) {
  function handleStartChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(dateValueToMonthDay(e.target.value), end);
  }

  function handleEndChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(start, dateValueToMonthDay(e.target.value));
  }

  return (
    <div className={styles.row} role="group" aria-label="Date range">
      <label className={styles.field}>
        <span className={styles.label}>From</span>
        <input
          type="date"
          className={styles.input}
          value={monthDayToDateValue(start)}
          onChange={handleStartChange}
          aria-label="Range start date"
        />
      </label>
      <span className={styles.dash} aria-hidden="true">–</span>
      <label className={styles.field}>
        <span className={styles.label}>To</span>
        <input
          type="date"
          className={styles.input}
          value={monthDayToDateValue(end)}
          onChange={handleEndChange}
          aria-label="Range end date"
        />
      </label>
    </div>
  );
}
