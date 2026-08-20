import type { ReactNode } from "react";
import { formatDayLabel } from "@/lib";
import type { Attraction } from "@/types/attraction";
import styles from "./CalendarSection.module.css";

interface SidebarAttractionCardProps {
  /** All scheduled/unscheduled instances of one attraction, grouped by the parent. */
  instances: Attraction[];
  days: string[];
  canEdit: boolean;
  icon: ReactNode;
  color: string;
  onAssign: (id: string, dayIso: string) => void;
  onUnassign: (id: string) => void;
  onDuplicate: (attraction: Attraction, dayIso: string) => void;
}

/** One sidebar card for an attraction — a single-instance card with an assign/unassign
 *  select, or (for an attraction scheduled more than once) a shared card with one row
 *  per instance plus a "+ Schedule again" control. */
export function SidebarAttractionCard({
  instances,
  days,
  canEdit,
  icon,
  color,
  onAssign,
  onUnassign,
  onDuplicate,
}: SidebarAttractionCardProps) {
  const first = instances[0];
  const anyScheduled = instances.some((i) => !!i.plannedDate);
  const canDuplicate = instances.length > 0 && instances.every((i) => !!i.attractionId);

  // Single instance (the common case): unchanged markup/behavior from before this
  // grouped-instances feature existed.
  if (instances.length === 1) {
    const a = first;
    const isScheduled = !!a.plannedDate;
    return (
      <div
        className={`${styles.sidebarCard} ${isScheduled ? styles.sidebarCardScheduled : ""}`}
        style={{ ["--type-color" as string]: color }}
      >
        <div className={styles.cardTopRow}>
          <div className={styles.typeIconCircle} aria-hidden="true">{icon}</div>
          <span className={styles.cardName}>{a.name}</span>
        </div>
        {isScheduled && a.plannedDate && (
          <span className={styles.dayBadge}>
            {formatDayLabel(a.plannedDate)}{a.plannedTime ? ` · ${a.plannedTime}` : ""}
          </span>
        )}
        {a.durationValue && (
          <span className={styles.recDuration}>Rec: {a.durationValue} {a.durationUnit}</span>
        )}
        {canEdit && (
          <select className={styles.assignSelect}
            value={a.plannedDate ?? ""}
            aria-label={`${isScheduled ? "Reassign" : "Assign"} ${a.name}`}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "__unassign__") onUnassign(a._id);
              else onAssign(a._id, val);
            }}
          >
            <option value="" disabled={isScheduled}>
              {isScheduled ? "Move to day…" : "Assign to day…"}
            </option>
            {isScheduled && <option value="__unassign__">— Unassign</option>}
            {days.map((day) => (
              <option key={day} value={day}>{formatDayLabel(day)}</option>
            ))}
          </select>
        )}
        {canEdit && isScheduled && a.attractionId && (
          <select className={styles.duplicateSelect}
            value=""
            aria-label={`Schedule ${a.name} again on another day`}
            onChange={(e) => {
              const val = e.target.value;
              if (val) onDuplicate(a, val);
            }}
          >
            <option value="">+ Schedule again…</option>
            {days.map((day) => (
              <option key={day} value={day}>{formatDayLabel(day)}</option>
            ))}
          </select>
        )}
      </div>
    );
  }

  // Multiple instances of the same attraction: one card, one row per instance — each
  // independently reassignable/unassignable — plus a single shared "+ Schedule again"
  // control to add yet another.
  return (
    <div
      className={`${styles.sidebarCard} ${anyScheduled ? styles.sidebarCardScheduled : ""}`}
      style={{ ["--type-color" as string]: color }}
    >
      <div className={styles.cardTopRow}>
        <div className={styles.typeIconCircle} aria-hidden="true">{icon}</div>
        <span className={styles.cardName}>{first.name}</span>
      </div>
      {first.durationValue && (
        <span className={styles.recDuration}>Rec: {first.durationValue} {first.durationUnit}</span>
      )}
      <div className={styles.instancesList}>
        {instances.map((a) => {
          const isScheduled = !!a.plannedDate;
          return (
            <div key={a._id} className={styles.instanceRow}>
              {isScheduled && a.plannedDate ? (
                <span className={styles.dayBadge}>
                  {formatDayLabel(a.plannedDate)}{a.plannedTime ? ` · ${a.plannedTime}` : ""}
                </span>
              ) : (
                <span className={styles.dayBadgeMuted}>Unscheduled</span>
              )}
              {canEdit && (
                <select className={styles.assignSelect}
                  value={a.plannedDate ?? ""}
                  aria-label={`${isScheduled ? "Reassign" : "Assign"} this instance of ${a.name}`}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__unassign__") onUnassign(a._id);
                    else onAssign(a._id, val);
                  }}
                >
                  <option value="" disabled={isScheduled}>
                    {isScheduled ? "Move to day…" : "Assign to day…"}
                  </option>
                  {isScheduled && (
                    <option value="__unassign__">
                      {a._id.startsWith("at-") ? "— Remove" : "— Unassign"}
                    </option>
                  )}
                  {days.map((day) => (
                    <option key={day} value={day}>{formatDayLabel(day)}</option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
      {canEdit && canDuplicate && (
        <select className={styles.duplicateSelect}
          value=""
          aria-label={`Schedule ${first.name} again on another day`}
          onChange={(e) => {
            const val = e.target.value;
            if (val) onDuplicate(first, val);
          }}
        >
          <option value="">+ Schedule again…</option>
          {days.map((day) => (
            <option key={day} value={day}>{formatDayLabel(day)}</option>
          ))}
        </select>
      )}
    </div>
  );
}
