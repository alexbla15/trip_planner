"use client";

import { useState } from "react";
import { Check, Luggage, MapPin, Plus, Pencil, Trash2, Layers, ArrowUpRight, Calendar, BadgeCheck, ChevronLeft, ChevronRight, Ban, Store } from "lucide-react";
import { ImageWithSkeleton } from "@/components/ImageWithSkeleton";
import { renderTypeIcon } from "@/components/IconPicker";
import { WebsiteLinkButton } from "@/components/WebsiteLinkButton";
import { Spinner } from "@/components/Spinner";
import { BrandModal } from "@/components/BrandModal";
import { getAttraction, getChildAttractions } from "@/services";
import { photoCropStyle } from "@/lib";
import { useAttractionTypes, useBrands } from "@/hooks";
import { formatDisplayDate, getNightsCount, isAttractionPermanentlyClosed } from "@/lib";
import { ATTRACTIONS_PAGE_SIZE } from "@/config/ui";
import type { Attraction } from "@/types/attraction";
import styles from "./AttractionGridCard.module.css";
import type { AttractionGridCardProps } from "./AttractionGridCard.types";

export function AttractionGridCard({ attraction, onClick, currentUserId, token, onAddToTrip, onEdit, onDelete, onBrandDeleted }: AttractionGridCardProps) {
  const { findType } = useAttractionTypes();
  const { brands, loading: brandsLoading } = useBrands();
  // Re-resolved against the live brand cache rather than trusting attraction.photoUrl as
  // fetched — that value was merged with the brand's photo server-side at fetch time, so it
  // goes stale the moment someone edits or deletes the brand without this grid refetching.
  // While the brand cache is still loading, fall back to the stale snapshot rather than
  // briefly showing "no brand" for an attraction that really does have one.
  const linkedBrand = attraction.brandId ? brands.find((b) => b._id === attraction.brandId) : undefined;
  const effectivePhotoUrl = attraction.ownPhotoUrl || linkedBrand?.photoUrl || (brandsLoading ? attraction.photoUrl : undefined);
  // A nested attraction (e.g. a specific ride inside a theme park) often has no photo of
  // its own — fall back to the parent's photo rather than showing the generic icon tile.
  const displayPhotoUrl = effectivePhotoUrl?.startsWith("http")
    ? effectivePhotoUrl
    : attraction.parentAttractionPhotoUrl?.startsWith("http")
      ? attraction.parentAttractionPhotoUrl
      : undefined;
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  // A URL that failed to load is treated as "no photo" so the icon tile shows instead of an
  // endless skeleton. Keyed on the URL itself, so a changed photo gets a fresh attempt.
  const hasPhoto = !!displayPhotoUrl && displayPhotoUrl !== failedPhotoUrl;
  const icon = renderTypeIcon(findType(attraction.types?.[0] ?? "")?.icon ?? "Globe");
  const canEdit = !!currentUserId && attraction.ownerId === currentUserId;
  const permanentlyClosed = isAttractionPermanentlyClosed(attraction.openingHours, attraction.seasonalHours);
  const isResidence = attraction.subtype === "residence";
  const nights = isResidence ? getNightsCount(attraction.checkInDate, attraction.checkOutDate) : null;

  const [childrenExpanded, setChildrenExpanded] = useState(false);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [children, setChildren] = useState<Attraction[] | null>(null);
  const [childrenPage, setChildrenPage] = useState(1);
  const [parentLoading, setParentLoading] = useState(false);
  const [brandModalOpen, setBrandModalOpen] = useState(false);

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

  const childrenTotalPages = Math.max(1, Math.ceil((children?.length ?? 0) / ATTRACTIONS_PAGE_SIZE));
  const paginatedChildren = children?.slice(
    (childrenPage - 1) * ATTRACTIONS_PAGE_SIZE, childrenPage * ATTRACTIONS_PAGE_SIZE
  );

  function stopAndPage(handler: () => void) {
    return (e: React.MouseEvent) => { e.stopPropagation(); handler(); };
  }

  const showActions = !!onAddToTrip || (canEdit && (!!onEdit || !!onDelete)) || !!attraction.websiteUrl;

  return (
    <article className={styles.card}>
      <div className={`${styles.photoArea} ${permanentlyClosed ? styles.photoAreaClosed : ""}`}>
        {hasPhoto ? (
          <ImageWithSkeleton
            key={displayPhotoUrl}
            src={displayPhotoUrl!}
            onLoadError={() => setFailedPhotoUrl(displayPhotoUrl!)}
            alt=""
            fill
            unoptimized
            className={styles.photoImg}
            wrapperClassName={styles.photoWrapper}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
            style={photoCropStyle(attraction.photoCrop)}
          />
        ) : (
          <div className={styles.photoFallback} aria-hidden="true">{icon}</div>
        )}

        {permanentlyClosed && (
          <div className={styles.closedOverlay}>
            <span className={styles.closedBanner}>
              <Ban size={12} aria-hidden="true" />
              Permanently closed
            </span>
          </div>
        )}

        <div className={styles.badges}>
          {attraction.verified && (
            <span className={`${styles.badge} ${styles.badgeVerified}`} title="Verified by an admin" aria-label="Verified by an admin">
              <BadgeCheck size={12} aria-hidden="true" />
            </span>
          )}
          {attraction.isVisited && (
            <span className={`${styles.badge} ${styles.badgeVisited}`} title="Visited" aria-label="Visited">
              <Check size={12} aria-hidden="true" />
            </span>
          )}
          {attraction.usedInTripNames && attraction.usedInTripNames.length > 0 && (
            <span className={`${styles.badge} ${styles.badgeTrip}`} title="Already in one of your trips" aria-label="Already in one of your trips">
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
      </div>

      <div className={`${styles.body}${permanentlyClosed ? ` ${styles.bodyClosed}` : ""}`}>
        <span className={styles.nameRow}>
          <span className={styles.typeIcon} aria-hidden="true">{icon}</span>
          <button
            type="button"
            className={styles.titleBtn}
            onClick={() => onClick(attraction)}
            aria-label={`View details for ${attraction.name}${permanentlyClosed ? " (permanently closed)" : ""}`}
          >
            <span className={styles.name}>{attraction.name}</span>
          </button>
          {attraction.brandId && attraction.brandName && (
            <button
              type="button"
              className={styles.nameIconBtn}
              onClick={(e) => { e.stopPropagation(); setBrandModalOpen(true); }}
              title={`Brand: "${attraction.brandName}"`}
              aria-label={`View ${attraction.brandName} brand details`}
            >
              <Store size={12} aria-hidden="true" />
            </button>
          )}
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
            <span className={styles.parentLineText}>Part of {attraction.parentAttractionName}</span>
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

      {/* Actions sit after the body in DOM order: on desktop they overlay the photo's
          top-left corner (absolute to the card); on touch they become a bottom row. */}
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

      {childrenExpanded && (
        <div className={styles.childrenSection}>
          {childrenLoading ? (
            <div className={styles.childrenLoading}>
              <Spinner variant="icon" iconSize={14} />
            </div>
          ) : (
            <>
              {paginatedChildren?.map((child) => {
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
              })}
              {childrenTotalPages > 1 && (
                <div className={styles.childrenPagination}>
                  <button
                    type="button"
                    className={styles.childrenPageBtn}
                    onClick={stopAndPage(() => setChildrenPage((p) => p - 1))}
                    disabled={childrenPage === 1}
                    aria-label="Previous places"
                  >
                    <ChevronLeft size={12} aria-hidden="true" />
                  </button>
                  <span className={styles.childrenPageInfo}>{childrenPage} / {childrenTotalPages}</span>
                  <button
                    type="button"
                    className={styles.childrenPageBtn}
                    onClick={stopAndPage(() => setChildrenPage((p) => p + 1))}
                    disabled={childrenPage === childrenTotalPages}
                    aria-label="Next places"
                  >
                    <ChevronRight size={12} aria-hidden="true" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {attraction.brandId && (
        <BrandModal
          isOpen={brandModalOpen}
          onClose={() => setBrandModalOpen(false)}
          brandId={attraction.brandId}
          onDeleted={() => onBrandDeleted?.(attraction.brandId!)}
        />
      )}
    </article>
  );
}
