import Image from "next/image";
import { Calendar } from "lucide-react";
import { MoodTagChip } from "@/components/MoodTagChip/MoodTagChip";
import { formatDisplayDate } from "@/lib/formatDate";
import styles from "./TripCard.module.css";
import type { TripCardProps } from "./TripCard.types";

export function TripCard({ trip }: TripCardProps) {
  const { name, country, coverImage, startDate, endDate, moods } = trip;

  return (
    <article className={styles.card}>
      <div className={styles.imageContainer}>
        {coverImage ? (
          <Image
            src={coverImage}
            alt={`${name} cover`}
            fill
            className={styles.image}
            sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) calc(50vw - 28px), calc(25vw - 30px)"
          />
        ) : (
          <div className={styles.imagePlaceholder} aria-hidden="true" />
        )}
        <div className={styles.imageOverlay} aria-hidden="true" />
      </div>
      <div className={styles.body}>
        <h3 className={styles.destination}>{name}</h3>
        <p className={styles.country}>{country}</p>
        <div className={styles.dates}>
          <Calendar size={14} className={styles.datesIcon} aria-hidden="true" />
          <span>
            {formatDisplayDate(startDate)} – {formatDisplayDate(endDate)}
          </span>
        </div>
        <div className={styles.tags}>
          {moods.slice(0, 2).map((tag) => (
            <MoodTagChip key={tag} tag={tag} />
          ))}
        </div>
      </div>
    </article>
  );
}
