import styles from "./TripCard.module.css";

export function TripCardSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={styles.skeletonImage} />
      <div className={styles.skeletonBody}>
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLineShort} />
        <div className={styles.skeletonChips}>
          <div className={styles.skeletonChip} />
          <div className={styles.skeletonChip} />
        </div>
      </div>
    </div>
  );
}
