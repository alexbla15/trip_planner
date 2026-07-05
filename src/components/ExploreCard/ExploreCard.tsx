import Link from "next/link";
import Image from "next/image";
import { MapPin, Heart } from "lucide-react";
import { MoodTagChip } from "@/components/MoodTagChip/MoodTagChip";
import styles from "./ExploreCard.module.css";
import type { ExploreCardProps } from "./ExploreCard.types";

export function ExploreCard({ item }: ExploreCardProps) {
  const { id, destination, coverImage, tag, tags, user, userAvatarUrl, likes } = item;
  const displayTags = tags?.length ? tags : [tag];
  const hasAvatar = !!userAvatarUrl;

  return (
    <Link href={`/trips/${id}`} className={styles.card}>
      <div className={styles.imageContainer}>
        <Image
          src={coverImage}
          alt={`${destination} community trip`}
          fill
          className={styles.image}
          sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) calc(50vw - 28px), calc(33vw - 24px)"
        />
        <div className={styles.tagBadge}>
          {displayTags.map((t) => (
            <MoodTagChip key={t} tag={t} />
          ))}
        </div>
        <div className={styles.attribution}>
          <div className={styles.avatarCircle} aria-hidden="true">
            {hasAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userAvatarUrl} alt="" className={styles.avatarImg} />
            ) : (
              user.charAt(0).toUpperCase()
            )}
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
    </Link>
  );
}
