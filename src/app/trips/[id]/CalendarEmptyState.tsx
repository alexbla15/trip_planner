import { Calendar } from "lucide-react";
import styles from "./CalendarSection.module.css";

interface CalendarEmptyStateProps {
  canEdit: boolean;
}

/** Shown in place of the day columns when the trip has no attractions yet. */
export function CalendarEmptyState({ canEdit }: CalendarEmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <Calendar size={36} className={styles.emptyIcon} aria-hidden="true" />
      <p className={styles.emptyText}>
        {canEdit ? "Add attractions to start planning your itinerary." : "No itinerary scheduled yet."}
      </p>
    </div>
  );
}
