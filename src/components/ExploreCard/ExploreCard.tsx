import Image from "next/image";
import { MapPin, Heart } from "lucide-react";
import { MoodTagChip } from "@/components/MoodTagChip/MoodTagChip";
import styles from "./ExploreCard.module.css";
import type { ExploreCardProps } from "./ExploreCard.types";

function getInitial(username: string): string {
  return username.charAt(0).toUpperCase();
}

export function ExploreCard({ item }: ExploreCardProps) {
  const { destination, coverImage, tag, user, likes } = item;

  return (
    <article className={styles.card}>
      <div className={styles.imageContainer}>
        <Image
          src={coverImage}
          alt={`${destination} community trip`}
          fill
          className={styles.image}
          sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) calc(50vw - 28px), calc(33vw - 24px)"
        />
        <div className={styles.tagBadge}>
          <MoodTagChip tag={tag} />
        </div>
        <div className={styles.attribution}>
          <div className={styles.avatarCircle} aria-hidden="true">
            {getInitial(user)}
          </div>
          <span className={styles.username}>@{user}</span>
        </div>
      </div>
      <div className={styles.body}>
        <h3 className={styles.destination}>{destination}</h3>
        <div className={styles.meta}>
          <div className={styles.metaItem}>
            <MapPin size={13} className={styles.metaIcon} aria-hidden="true" />
            <span>{destination.split(",")[1]?.trim() ?? destination}</span>
          </div>
          <div className={styles.metaItem} aria-label={`${likes} likes`}>
            <Heart size={13} className={styles.metaIcon} aria-hidden="true" />
            <span>{likes.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
