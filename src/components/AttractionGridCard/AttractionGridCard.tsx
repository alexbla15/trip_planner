"use client";

import { Check, Luggage, MapPin, Plus, Pencil, Trash2, Layers, Building2 } from "lucide-react";
import { ImageWithSkeleton } from "@/components/ImageWithSkeleton";
import { renderTypeIcon } from "@/components/IconPicker";
import { WebsiteLinkButton } from "@/components/WebsiteLinkButton";
import { useAttractionTypes } from "@/hooks";
import type { Attraction } from "@/types/attraction";
import styles from "./AttractionGridCard.module.css";
import type { AttractionGridCardProps } from "./AttractionGridCard.types";

export function AttractionGridCard({ attraction, onClick, currentUserId, onAddToTrip, onEdit, onDelete }: AttractionGridCardProps) {
  const { findType } = useAttractionTypes();
  const hasPhoto = !!attraction.photoUrl?.startsWith("http");
  const icon = renderTypeIcon(findType(attraction.types?.[0] ?? "")?.icon ?? "Globe");
  const canEdit = !!currentUserId && attraction.ownerId === currentUserId;

  function stopAnd(handler: (attraction: Attraction) => void) {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      handler(attraction);
    };
  }

  const showActions = !!onAddToTrip || (canEdit && (!!onEdit || !!onDelete)) || !!attraction.websiteUrl;

  return (
    <div
      role="button"
      tabIndex={0}
      className={styles.card}
      onClick={() => onClick(attraction)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(attraction);
        }
      }}
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
            wrapperClassName={styles.photoWrapper}
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
          {!!attraction.childAttractionCount && attraction.childAttractionCount > 0 && (
            <span
              className={`${styles.badge} ${styles.badgeChildren}`}
              title={`Contains ${attraction.childAttractionCount} place${attraction.childAttractionCount === 1 ? "" : "s"}`}
            >
              <Layers size={12} aria-hidden="true" />
            </span>
          )}
        </div>

        {showActions && (
          <div className={styles.actions}>
            <WebsiteLinkButton
              url={attraction.websiteUrl}
              variant="compact"
              className={styles.actionBtnLink}
            />
            {onAddToTrip && (
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnAdd}`}
                onClick={stopAnd(onAddToTrip)}
                title="Add to my trip"
                aria-label={`Add ${attraction.name} to a trip`}
              >
                <Plus size={13} aria-hidden="true" />
              </button>
            )}
            {canEdit && onEdit && (
              <button
                type="button"
                className={styles.actionBtn}
                onClick={stopAnd(onEdit)}
                title="Edit attraction"
                aria-label={`Edit ${attraction.name}`}
              >
                <Pencil size={13} aria-hidden="true" />
              </button>
            )}
            {canEdit && onDelete && (
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                onClick={stopAnd(onDelete)}
                title="Delete attraction"
                aria-label={`Delete ${attraction.name}`}
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className={styles.body}>
        <span className={styles.nameRow}>
          <span className={styles.typeIcon} aria-hidden="true">{icon}</span>
          <span className={styles.name}>{attraction.name}</span>
        </span>
        {attraction.city && (
          <span className={styles.meta}>
            <MapPin size={11} aria-hidden="true" />
            {attraction.city}
          </span>
        )}
        {attraction.parentAttractionId && attraction.parentAttractionName && (
          <span className={styles.parentLine} title={`Part of "${attraction.parentAttractionName}"`}>
            <Building2 size={11} aria-hidden="true" />
            {attraction.parentAttractionName}
          </span>
        )}
      </div>
    </div>
  );
}
