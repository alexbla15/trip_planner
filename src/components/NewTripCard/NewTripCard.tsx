import Link from "next/link";
import { Compass } from "lucide-react";
import styles from "./NewTripCard.module.css";

interface NewTripCardProps {
  className?: string;
}

export function NewTripCard({ className }: NewTripCardProps) {
  return (
    <Link
      href="/new-trip"
      className={className ? `${styles.card} ${className}` : styles.card}
      aria-label="Plan a new trip"
    >
      <Compass size={48} className={styles.icon} aria-hidden="true" />
      <span className={styles.label}>Plan a new trip</span>
    </Link>
  );
}
