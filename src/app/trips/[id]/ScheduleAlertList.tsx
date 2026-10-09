import { TriangleAlert, X, ArrowUpRight } from "lucide-react";
import type { ScheduleAlert } from "./CalendarSection.utils";
import type { Attraction } from "@/types/attraction";
import styles from "./CalendarSection.module.css";

interface ScheduleAlertListProps {
  alerts: ScheduleAlert[];
  attractions: Attraction[];
  onDismiss: (id: string) => void;
  onOpenAttraction: (attraction: Attraction) => void;
}

/** Dismissible warning banners shown above the calendar (e.g. overbooked day, conflicting
 *  times). Each lists a small "view" link per attraction it's about (two for a "conflict"
 *  alert, one otherwise) so the relevant attraction card can be opened straight from the
 *  warning instead of hunting for it in the schedule. */
export function ScheduleAlertList({ alerts, attractions, onDismiss, onOpenAttraction }: ScheduleAlertListProps) {
  return (
    <>
      {alerts.map((alert) => {
        const linked = alert.attractionIds
          .map((id) => attractions.find((a) => a._id === id))
          .filter((a): a is Attraction => !!a);
        return (
          <div key={alert.id} className={styles.alertBanner} role="alert">
            <TriangleAlert size={14} className={styles.alertIcon} aria-hidden="true" />
            <div className={styles.alertBody}>
              <span className={styles.alertMessage}>{alert.message}</span>
              {linked.length > 0 && (
                <div className={styles.alertViewLinks}>
                  {linked.map((a) => (
                    <button
                      key={a._id}
                      type="button"
                      className={styles.alertViewLink}
                      onClick={() => onOpenAttraction(a)}
                    >
                      {a.name}
                      <ArrowUpRight size={11} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              className={styles.alertDismiss}
              onClick={() => onDismiss(alert.id)}
              aria-label="Dismiss warning"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </>
  );
}
