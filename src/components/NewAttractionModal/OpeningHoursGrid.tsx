"use client";

import type { DayKey, OpeningHours } from "./attraction.types";
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
  open: string;
  close: string;
  onClosedToggle: () => void;
  onOpenChange: (val: string) => void;
  onCloseChange: (val: string) => void;
}

function DayRow({
  day,
  isOdd,
  closed,
  open,
  close,
  onClosedToggle,
  onOpenChange,
  onCloseChange,
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

      <div className={`${styles.timeInputs} ${closed ? styles.timeInputsDisabled : ""}`}>
        <input
          type="time"
          value={open}
          onChange={(e) => onOpenChange(e.target.value)}
          disabled={closed}
          aria-label={`${day} opening time`}
          className={styles.timeInput}
        />
        <span className={styles.timeSeparator} aria-hidden="true">
          –
        </span>
        <input
          type="time"
          value={close}
          onChange={(e) => onCloseChange(e.target.value)}
          disabled={closed}
          aria-label={`${day} closing time`}
          className={styles.timeInput}
        />
      </div>
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

  function handleTimeChange(day: DayKey, field: "open" | "close", val: string) {
    onChange({
      ...value,
      [day]: { ...value[day], [field]: val },
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
          open={value[day].open}
          close={value[day].close}
          onClosedToggle={() => handleClosedToggle(day)}
          onOpenChange={(val) => handleTimeChange(day, "open", val)}
          onCloseChange={(val) => handleTimeChange(day, "close", val)}
        />
      ))}
    </div>
  );
}
