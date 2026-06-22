import Link from "next/link";
import { Compass } from "lucide-react";
import styles from "./NewTripCard.module.css";

export function NewTripCard() {
  return (
    <Link href="/new-trip" className={styles.card} aria-label="Plan a new adventure">
      <Compass size={48} className={styles.icon} aria-hidden="true" />
      <span className={styles.label}>Plan a new adventure</span>
    </Link>
  );
}
