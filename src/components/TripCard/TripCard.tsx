import Image from "next/image";
import { Calendar } from "lucide-react";
import { MoodTagChip } from "@/components/MoodTagChip/MoodTagChip";
import styles from "./TripCard.module.css";
import type { TripCardProps } from "./TripCard.types";

export function TripCard({ trip }: TripCardProps) {
  const { destination, coverImage, startDate, endDate, tags } = trip;

  return (
    <article className={styles.card}>
      <div className={styles.imageContainer}>
        <Image
          src={coverImage}
          alt={`${destination} trip cover`}
          fill
          className={styles.image}
          sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) calc(50vw - 28px), calc(25vw - 30px)"
        />
        <div className={styles.imageOverlay} aria-hidden="true" />
      </div>
      <div className={styles.body}>
        <h3 className={styles.destination}>{destination}</h3>
        <div className={styles.dates}>
          <Calendar
            size={14}
            className={styles.datesIcon}
            aria-hidden="true"
          />
          <span>
            {startDate} – {endDate}
          </span>
        </div>
        <div className={styles.tags}>
          {tags.slice(0, 2).map((tag) => (
            <MoodTagChip key={tag} tag={tag} />
          ))}
        </div>
      </div>
    </article>
  );
}
