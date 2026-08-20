import { TriangleAlert, X } from "lucide-react";
import type { ScheduleAlert } from "./CalendarSection.utils";
import styles from "./CalendarSection.module.css";

interface ScheduleAlertListProps {
  alerts: ScheduleAlert[];
  onDismiss: (id: string) => void;
}

/** Dismissible warning banners shown above the calendar (e.g. overbooked day, conflicting times). */
export function ScheduleAlertList({ alerts, onDismiss }: ScheduleAlertListProps) {
  return (
    <>
      {alerts.map((alert) => (
        <div key={alert.id} className={styles.alertBanner} role="alert">
          <TriangleAlert size={14} className={styles.alertIcon} aria-hidden="true" />
          <span className={styles.alertMessage}>{alert.message}</span>
          <button
            type="button"
            className={styles.alertDismiss}
            onClick={() => onDismiss(alert.id)}
            aria-label="Dismiss warning"
          >
            <X size={12} aria-hidden="true" />
          </button>
        </div>
      ))}
    </>
  );
}
