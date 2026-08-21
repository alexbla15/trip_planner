"use client";

import { Check, Luggage, MapPin } from "lucide-react";
import { ImageWithSkeleton } from "@/components/ImageWithSkeleton";
import { renderTypeIcon } from "@/components/IconPicker";
import { useAttractionTypes } from "@/hooks";
import styles from "./AttractionGridCard.module.css";
import type { AttractionGridCardProps } from "./AttractionGridCard.types";

export function AttractionGridCard({ attraction, onClick }: AttractionGridCardProps) {
  const { findType } = useAttractionTypes();
  const hasPhoto = !!attraction.photoUrl?.startsWith("http");
  const icon = renderTypeIcon(findType(attraction.types?.[0] ?? "")?.icon ?? "Globe");

  return (
    <button
      type="button"
      className={styles.card}
      onClick={() => onClick(attraction)}
      aria-label={`View details for ${attraction.name}`}
    >
      <div className={styles.photoArea}>
        {hasPhoto ? (
          <ImageWithSkeleton
            src={attraction.photoUrl!}
            alt=""
            fill
            unoptimized
            className={styles.photoImg}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
          />
        ) : (
          <div className={styles.photoFallback} aria-hidden="true">{icon}</div>
        )}

        <div className={styles.badges}>
          {attraction.isVisited && (
            <span className={styles.badge} title="Visited">
              <Check size={12} aria-hidden="true" />
            </span>
          )}
          {attraction.usedInTripNames && attraction.usedInTripNames.length > 0 && (
            <span className={`${styles.badge} ${styles.badgeTrip}`} title="Already in one of your trips">
              <Luggage size={12} aria-hidden="true" />
            </span>
          )}
        </div>
      </div>

      <div className={styles.body}>
        <span className={styles.name}>{attraction.name}</span>
        {attraction.city && (
          <span className={styles.meta}>
            <MapPin size={11} aria-hidden="true" />
            {attraction.city}
          </span>
        )}
      </div>
    </button>
  );
}
