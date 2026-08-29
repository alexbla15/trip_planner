"use client";

import { useState } from "react";
import { Check, Luggage, MapPin, Plus, Pencil, Trash2, Layers, ArrowUpRight, Calendar, BadgeCheck } from "lucide-react";
import { ImageWithSkeleton } from "@/components/ImageWithSkeleton";
import { renderTypeIcon } from "@/components/IconPicker";
import { WebsiteLinkButton } from "@/components/WebsiteLinkButton";
import { Spinner } from "@/components/Spinner";
import { getAttraction, getChildAttractions } from "@/services";
import { useAttractionTypes } from "@/hooks";
import { formatDisplayDate, getNightsCount } from "@/lib";
import type { Attraction } from "@/types/attraction";
import styles from "./AttractionGridCard.module.css";
import type { AttractionGridCardProps } from "./AttractionGridCard.types";

export function AttractionGridCard({ attraction, onClick, currentUserId, token, onAddToTrip, onEdit, onDelete }: AttractionGridCardProps) {
  const { findType } = useAttractionTypes();
  const hasPhoto = !!attraction.photoUrl?.startsWith("http");
  const icon = renderTypeIcon(findType(attraction.types?.[0] ?? "")?.icon ?? "Globe");
  const canEdit = !!currentUserId && attraction.ownerId === currentUserId;
  const isResidence = attraction.subtype === "residence";
  const nights = isResidence ? getNightsCount(attraction.checkInDate, attraction.checkOutDate) : null;

  const [childrenExpanded, setChildrenExpanded] = useState(false);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [children, setChildren] = useState<Attraction[] | null>(null);
  const [parentLoading, setParentLoading] = useState(false);

  function stopAnd(handler: (attraction: Attraction) => void) {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      handler(attraction);
    };
  }

  function handleOpenParent(e: React.MouseEvent) {
    e.stopPropagation();
    if (!attraction.parentAttractionId || parentLoading) return;
    setParentLoading(true);
    getAttraction(attraction.parentAttractionId, token)
      .then((parent) => onClick(parent as Attraction))
      .finally(() => setParentLoading(false));
  }

  function handleToggleChildren(e: React.MouseEvent) {
    e.stopPropagation();
    setChildrenExpanded((prev) => !prev);
    if (children === null && !childrenLoading) {
      setChildrenLoading(true);
      getChildAttractions(attraction._id, token)
        .then((data) => setChildren(data as Attraction[]))
        .catch(() => setChildren([]))
        .finally(() => setChildrenLoading(false));
    }
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
          {attraction.verified && (
            <span className={`${styles.badge} ${styles.badgeVerified}`} title="Verified by an admin">
              <BadgeCheck size={12} aria-hidden="true" />
            </span>
          )}
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
            <button
              type="button"
              className={`${styles.badge} ${styles.badgeChildren} ${styles.badgeChildrenButton}`}
              onClick={handleToggleChildren}
              aria-expanded={childrenExpanded}
              title={`Contains ${attraction.childAttractionCount} place${attraction.childAttractionCount === 1 ? "" : "s"} — click to ${childrenExpanded ? "hide" : "view"}`}
              aria-label={`${childrenExpanded ? "Hide" : "View"} the ${attraction.childAttractionCount} place${attraction.childAttractionCount === 1 ? "" : "s"} inside ${attraction.name}`}
            >
              <Layers size={12} aria-hidden="true" />
            </button>
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
        {attraction.parentAttractionId && attraction.parentAttractionName && (
          <button
            type="button"
            className={styles.parentLine}
            onClick={handleOpenParent}
            title={`View "${attraction.parentAttractionName}"`}
            aria-label={`View details for ${attraction.parentAttractionName}, which ${attraction.name} is part of`}
          >
            <ArrowUpRight size={11} aria-hidden="true" />
            ({attraction.parentAttractionName})
          </button>
        )}
        {attraction.city && (
          <span className={styles.meta}>
            <MapPin size={11} aria-hidden="true" />
            {attraction.city}
          </span>
        )}
        {isResidence && (
          <div className={styles.residenceBlock}>
            {attraction.residenceType && (
              <span className={styles.residenceTypeChip}>{attraction.residenceType}</span>
            )}
            {(attraction.checkInDate || attraction.checkOutDate) && (
              <span className={styles.residenceDates}>
                <Calendar size={11} aria-hidden="true" />
                {attraction.checkInDate && attraction.checkOutDate
                  ? `${formatDisplayDate(attraction.checkInDate)} → ${formatDisplayDate(attraction.checkOutDate)}`
                  : formatDisplayDate(attraction.checkInDate ?? attraction.checkOutDate!)}
                {nights != null && nights > 0 && (
                  <span className={styles.residenceNights}>{nights}n</span>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {childrenExpanded && (
        <div className={styles.childrenSection}>
          {childrenLoading ? (
            <div className={styles.childrenLoading}>
              <Spinner variant="icon" iconSize={14} />
            </div>
          ) : (
            children?.map((child) => {
              const childIcon = renderTypeIcon(findType(child.types?.[0] ?? "")?.icon ?? "Globe");
              return (
                <button
                  type="button"
                  key={child._id}
                  className={styles.childRow}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick(child);
                  }}
                  aria-label={`View details for ${child.name}`}
                >
                  <span className={styles.childRowIcon} aria-hidden="true">{childIcon}</span>
                  <span className={styles.childRowName}>{child.name}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
