"use client";

import { Plus, X } from "lucide-react";
import type { DayKey, OpeningHours, OpeningHoursRange } from "./attraction.types";
import { DAY_KEYS } from "./attraction.constants";
import styles from "./OpeningHoursGrid.module.css";

interface OpeningHoursGridProps {
  value: OpeningHours;
  onChange: (hours: OpeningHours) => void;
}

interface DayRowProps {
  day: DayKey;
  isOdd: boolean;
  closed: boolean;
  ranges: OpeningHoursRange[];
  onClosedToggle: () => void;
  onRangeChange: (rangeIndex: number, field: "open" | "close", val: string) => void;
  onAddRange: () => void;
  onRemoveRange: (rangeIndex: number) => void;
}

function DayRow({
  day,
  isOdd,
  closed,
  ranges,
  onClosedToggle,
  onRangeChange,
  onAddRange,
  onRemoveRange,
}: DayRowProps) {
  const toggleId = `hours-closed-${day}`;

  return (
    <div className={`${styles.row} ${isOdd ? styles.rowOdd : ""}`}>
      <span className={styles.dayLabel} aria-label={day}>
        {day}
      </span>

      <div className={styles.closedControl}>
        <button
          type="button"
          role="switch"
          id={toggleId}
          aria-checked={closed}
          aria-label={`Mark ${day} as closed`}
          className={`${styles.toggle} ${closed ? styles.toggleOn : ""}`}
          onClick={onClosedToggle}
        >
          <span className={styles.toggleThumb} />
        </button>
        <span className={styles.closedLabel} aria-hidden="true">
          Closed
        </span>
      </div>

      {!closed && (
        <div className={styles.rangeList}>
          {ranges.map((range, i) => {
            const isLast = i === ranges.length - 1;
            return (
              <div key={i} className={styles.timeInputs}>
                <input
                  type="time"
                  value={range.open}
                  onChange={(e) => onRangeChange(i, "open", e.target.value)}
                  aria-label={`${day} opening time${ranges.length > 1 ? ` (range ${i + 1})` : ""}`}
                  className={styles.timeInput}
                />
                <span className={styles.timeSeparator} aria-hidden="true">
                  –
                </span>
                <input
                  type="time"
                  value={range.close}
                  onChange={(e) => onRangeChange(i, "close", e.target.value)}
                  aria-label={`${day} closing time${ranges.length > 1 ? ` (range ${i + 1})` : ""}`}
                  className={styles.timeInput}
                />
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => onRemoveRange(i)}
                    aria-label={`Remove this opening-hours range for ${day}`}
                    className={`${styles.rangeButton} ${styles.removeRangeButton}`}
                  >
                    <X size={14} />
                  </button>
                )}
                {isLast && (
                  <button
                    type="button"
                    onClick={onAddRange}
                    aria-label={`Add another opening-hours range for ${day}`}
                    className={styles.rangeButton}
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function OpeningHoursGrid({ value, onChange }: OpeningHoursGridProps) {
  function handleClosedToggle(day: DayKey) {
    onChange({
      ...value,
      [day]: { ...value[day], closed: !value[day].closed },
    });
  }

  function handleRangeChange(day: DayKey, rangeIndex: number, field: "open" | "close", val: string) {
    const ranges = value[day].ranges.map((r, i) => (i === rangeIndex ? { ...r, [field]: val } : r));
    onChange({ ...value, [day]: { ...value[day], ranges } });
  }

  function handleAddRange(day: DayKey) {
    onChange({
      ...value,
      [day]: { ...value[day], ranges: [...value[day].ranges, { open: "09:00", close: "18:00" }] },
    });
  }

  function handleRemoveRange(day: DayKey, rangeIndex: number) {
    onChange({
      ...value,
      [day]: { ...value[day], ranges: value[day].ranges.filter((_, i) => i !== rangeIndex) },
    });
  }

  return (
    <div className={styles.grid} role="group" aria-label="Opening hours by day">
      {DAY_KEYS.map((day, i) => (
        <DayRow
          key={day}
          day={day}
          isOdd={i % 2 !== 0}
          closed={value[day].closed}
          ranges={value[day].ranges}
          onClosedToggle={() => handleClosedToggle(day)}
          onRangeChange={(rangeIndex, field, val) => handleRangeChange(day, rangeIndex, field, val)}
          onAddRange={() => handleAddRange(day)}
          onRemoveRange={(rangeIndex) => handleRemoveRange(day, rangeIndex)}
        />
      ))}
    </div>
  );
}
