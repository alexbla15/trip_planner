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

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// Feb capped at 29 (not 28) — these ranges recur annually with no specific year attached,
// so Feb 29 stays a pickable endpoint rather than being excluded in a non-leap context.
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Precise start/end date-range picker (month/day only, no year — recurs annually). Uses
 *  plain month/day dropdowns rather than `<input type="date">` — a native date input
 *  always renders a year alongside month/day, which is misleading here since the year is
 *  never read or stored and the range applies every year. */
export function SeasonalRangePicker({ start, end, onChange }: SeasonalRangePickerProps) {
  function handleStartMonth(e: ChangeEvent<HTMLSelectElement>) {
    const month = Number(e.target.value);
    onChange(month ? { month, day: Math.min(start?.day ?? 1, DAYS_IN_MONTH[month - 1]) } : null, end);
  }

  function handleStartDay(e: ChangeEvent<HTMLSelectElement>) {
    const day = Number(e.target.value);
    onChange(start ? { ...start, day } : day ? { month: 1, day } : null, end);
  }

  function handleEndMonth(e: ChangeEvent<HTMLSelectElement>) {
    const month = Number(e.target.value);
    onChange(start, month ? { month, day: Math.min(end?.day ?? 1, DAYS_IN_MONTH[month - 1]) } : null);
  }

  function handleEndDay(e: ChangeEvent<HTMLSelectElement>) {
    const day = Number(e.target.value);
    onChange(start, end ? { ...end, day } : day ? { month: 1, day } : null);
  }

  const startDayCount = DAYS_IN_MONTH[(start?.month ?? 1) - 1];
  const endDayCount = DAYS_IN_MONTH[(end?.month ?? 1) - 1];

  return (
    <div className={styles.row} role="group" aria-label="Date range">
      <div className={styles.field}>
        <span className={styles.label}>From</span>
        <div className={styles.monthDayRow}>
          <select className={styles.select} value={start?.month ?? ""} onChange={handleStartMonth} aria-label="Range start month">
            <option value="">Month</option>
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>{name}</option>
            ))}
          </select>
          <select className={styles.selectDay} value={start?.day ?? ""} onChange={handleStartDay} aria-label="Range start day">
            <option value="">Day</option>
            {Array.from({ length: startDayCount }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>
      </div>
      <span className={styles.dash} aria-hidden="true">–</span>
      <div className={styles.field}>
        <span className={styles.label}>To</span>
        <div className={styles.monthDayRow}>
          <select className={styles.select} value={end?.month ?? ""} onChange={handleEndMonth} aria-label="Range end month">
            <option value="">Month</option>
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>{name}</option>
            ))}
          </select>
          <select className={styles.selectDay} value={end?.day ?? ""} onChange={handleEndDay} aria-label="Range end day">
            <option value="">Day</option>
            {Array.from({ length: endDayCount }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
