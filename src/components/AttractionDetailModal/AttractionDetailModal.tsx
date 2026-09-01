"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { ImageWithSkeleton } from "@/components";
import {
  X,
  MapPin,
  Globe,
  Building2,
  Clock,
  Wallet,
  FileText,
  ImageIcon,
  Navigation,
  Timer,
  Calendar,
  BedDouble,
  Plane,
  Tag,
  Pencil,
  Trash2,
  Plus,
  Check,
  Luggage,
  Layers,
  UtensilsCrossed,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { renderTypeIcon } from "@/components/IconPicker";
import { WebsiteLinkButton } from "@/components/WebsiteLinkButton";
import { Spinner } from "@/components/Spinner";
import { getAttraction, getChildAttractions, getOtherLocationsInCity } from "@/services";
import { useAttractionTypes } from "@/hooks";
import { ATTRACTIONS_PAGE_SIZE } from "@/config/ui";

const LocationViewMap = dynamic(
  () => import("./LocationViewMap").then((m) => ({ default: m.LocationViewMap })),
  { ssr: false, loading: () => <div className={styles.locationMapLoading} /> }
);
import type { AttractionType } from "@/components/NewAttractionModal";
import type { Attraction } from "@/types/attraction";
import { formatDisplayDate, formatPrice, getStatusChips, getUniformHoursLabel } from "@/lib";
import styles from "./AttractionDetailModal.module.css";

const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

interface AttractionDetailModalProps {
  attraction: Attraction | null;
  onClose: () => void;
  onEditTime?: () => void;
  canEdit?: boolean;
  onEdit?: () => void;
  onAddToTrip?: () => void;
  /** Present only when the attraction being viewed is already part of the current trip's
   *  itinerary and the caller can edit it — unlinks it from the trip (every scheduled
   *  instance), same as the "Remove" action elsewhere in the trip's Attractions tab. */
  onRemoveFromTrip?: () => void;
  /** Present only when `canEdit` is true — permanently deletes the shared Attraction
   *  document from the database (not just unlinking it from one trip). The caller is
   *  responsible for confirming this destructive action before invoking it. */
  onDelete?: () => void;
  /** Present only for a logged-in user viewing a real (non custom-slot/flight)
   *  attraction — toggling marks/unmarks it as personally visited. */
  onToggleVisited?: () => void;
  isVisited?: boolean;
  /** Switches the modal to display a different attraction — e.g. clicking a child row
   *  in the "Contains N places" list, or the "Part of X" parent chip. Callers wire this
   *  to the same state setter used to originally open the modal. Omit to disable this
   *  cross-navigation (the chips/rows still render, just non-interactive). */
  onNavigateToAttraction?: (attraction: Attraction) => void;
  /** Present only for an admin viewer — toggles the admin-curated "verified" mark.
   *  Non-admins never see this control; the badge itself (when `attraction.verified`)
   *  is always shown regardless. */
  onToggleVerified?: () => void;
  verifiedToggling?: boolean;
}

export function AttractionDetailModal({ attraction, onClose, onEditTime, canEdit, onEdit, onAddToTrip, onRemoveFromTrip, onDelete, onToggleVisited, isVisited, onNavigateToAttraction, onToggleVerified, verifiedToggling }: AttractionDetailModalProps) {
  const { findType } = useAttractionTypes();
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [childrenExpanded, setChildrenExpanded] = useState(false);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [children, setChildren] = useState<Attraction[] | null>(null);
  const [childrenPage, setChildrenPage] = useState(1);
  const [parentLoading, setParentLoading] = useState(false);

  const [otherLocationsExpanded, setOtherLocationsExpanded] = useState(false);
  const [otherLocationsLoading, setOtherLocationsLoading] = useState(false);
  const [otherLocations, setOtherLocations] = useState<Attraction[] | null>(null);
  const [otherLocationsPage, setOtherLocationsPage] = useState(1);

  useEffect(() => { setMounted(true); }, []);

  // Reset the children expansion whenever a different attraction is shown — otherwise
  // reopening the modal for a new attraction would briefly show the previous one's
  // cached children list.
  useEffect(() => {
    setChildrenExpanded(false);
    setChildrenLoading(false);
    setChildren(null);
    setChildrenPage(1);
    setOtherLocationsExpanded(false);
    setOtherLocationsLoading(false);
    setOtherLocations(null);
    setOtherLocationsPage(1);
  }, [attraction?._id]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (!attraction) return;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [attraction, handleKeyDown]);

  if (!mounted || !attraction) return null;

  const isResidence = attraction.subtype === "residence";
  const isFlight    = attraction.subtype === "flight";
  const statusChips = getStatusChips(attraction.openingHours, attraction.openingMonths);
  // Only "Open 24/7" and "Permanently closed" already convey the full hours story on
  // their own — the "seasonal" chip just says which months apply and says nothing about
  // the actual daily hours, so it must NOT suppress the hours table/info-item below (a
  // seasonally-open place like Gardaland still has real per-day hours worth showing).
  const hoursCoveredByChip = statusChips.some((c) => c.key === "open-24-7" || c.key === "permanently-closed");
  const uniformHoursLabel = attraction.openingHours ? getUniformHoursLabel(attraction.openingHours) : null;
  const hasMultiplePriceTiers = (attraction.prices?.length ?? 0) > 1;
  // A nested attraction (e.g. a specific ride inside a theme park) often has no photo of
  // its own — fall back to the parent's photo rather than showing no photo at all.
  const displayPhotoUrl = attraction.photoUrl?.startsWith("http")
    ? attraction.photoUrl
    : attraction.parentAttractionPhotoUrl?.startsWith("http")
      ? attraction.parentAttractionPhotoUrl
      : undefined;

  function handleToggleChildren(e: React.MouseEvent) {
    e.stopPropagation();
    if (!attraction) return;
    setChildrenExpanded((prev) => !prev);
    if (children === null && !childrenLoading) {
      setChildrenLoading(true);
      getChildAttractions(attraction._id)
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

  // Other branches of the same chain (e.g. McDonald's, Adidas) in the same city — the `q`
  // param is a partial case-insensitive regex match server-side, so the result is filtered
  // here to an exact (trimmed, case-insensitive) name match, and the attraction currently
  // being viewed is excluded from its own "other locations" list.
  function handleToggleOtherLocations(e: React.MouseEvent) {
    e.stopPropagation();
    if (!attraction || !attraction.city) return;
    setOtherLocationsExpanded((prev) => !prev);
    if (otherLocations === null && !otherLocationsLoading) {
      setOtherLocationsLoading(true);
      getOtherLocationsInCity(attraction.name, attraction.city)
        .then((data) => {
          const normalizedName = attraction.name.trim().toLowerCase();
          const matches = (data as Attraction[]).filter(
            (a) => a._id !== attraction._id && a.name.trim().toLowerCase() === normalizedName
          );
          setOtherLocations(matches);
        })
        .catch(() => setOtherLocations([]))
        .finally(() => setOtherLocationsLoading(false));
    }
  }

  const otherLocationsTotalPages = Math.max(1, Math.ceil((otherLocations?.length ?? 0) / ATTRACTIONS_PAGE_SIZE));
  const paginatedOtherLocations = otherLocations?.slice(
    (otherLocationsPage - 1) * ATTRACTIONS_PAGE_SIZE, otherLocationsPage * ATTRACTIONS_PAGE_SIZE
  );

  function handleOpenParent(e: React.MouseEvent) {
    e.stopPropagation();
    if (!attraction || !attraction.parentAttractionId || !onNavigateToAttraction || parentLoading) return;
    setParentLoading(true);
    getAttraction(attraction.parentAttractionId)
      .then((parent) => onNavigateToAttraction(parent as Attraction))
      .finally(() => setParentLoading(false));
  }

  const firstType = attraction.types?.[0] as AttractionType | undefined;
  const typeIcon = isResidence && !firstType
    ? <BedDouble size={16} aria-hidden="true" />
    : firstType ? renderTypeIcon(findType(firstType)?.icon ?? "Globe") : null;

  const durationLabel = attraction.durationValue
    ? `${attraction.durationValue} ${attraction.durationUnit ?? "hours"}`
    : null;

  const todayKey = DAY_KEYS[(new Date().getDay() + 6) % 7];

  const modal = (
    <div
      className={styles.backdrop}
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${attraction.name} details`}
        className={styles.container}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            {typeIcon && (
              <span className={styles.headerIcon} aria-hidden="true">
                {typeIcon}
              </span>
            )}
            <h2 className={styles.title}>{attraction.name}</h2>
          </div>
          <div className={styles.headerActions}>
            <WebsiteLinkButton url={attraction.websiteUrl} variant="compact" className={styles.websiteBtn} />
            {onToggleVerified && (
              <button
                type="button"
                className={`${styles.visitedToggleBtn} ${attraction.verified ? styles.visitedToggleBtnActive : ""}`}
                onClick={onToggleVerified}
                disabled={!!verifiedToggling}
                aria-pressed={!!attraction.verified}
                aria-label={attraction.verified ? `Unmark ${attraction.name} as verified` : `Mark ${attraction.name} as verified`}
                title={attraction.verified ? "Verified — click to unverify" : "Mark as verified"}
              >
                <BadgeCheck size={18} aria-hidden="true" />
              </button>
            )}
            {onToggleVisited && (
              <button
                type="button"
                className={`${styles.visitedToggleBtn} ${isVisited ? styles.visitedToggleBtnActive : ""}`}
                onClick={onToggleVisited}
                aria-pressed={!!isVisited}
                aria-label={isVisited ? `${attraction.name} marked as visited — click to unmark` : `Mark ${attraction.name} as visited`}
                title={isVisited ? "Visited" : "Mark as visited"}
              >
                <Check size={18} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Photo */}
          {displayPhotoUrl && (
            <div className={styles.photo}>
              <ImageWithSkeleton
                src={displayPhotoUrl}
                alt={`${attraction.name} photo`}
                fill
                unoptimized
                className={styles.photoImg}
                sizes="(max-width: 640px) 100vw, 500px"
              />
            </div>
          )}

          {/* Types + status chips (24/7, and later year-round/permanently-closed) —
              rendered together in one row since they're both "chip" facts about the
              attraction, not two separate concepts needing their own sections. */}
          {(attraction.types?.length > 0 || (attraction.foodStyles?.length ?? 0) > 0 || statusChips.length > 0) && (
            <div className={styles.section}>
              <div className={styles.chips}>
                {attraction.types?.map((t) => (
                  <span key={t} className={styles.chip}>
                    {renderTypeIcon(findType(t)?.icon ?? "Globe")}
                    {t}
                  </span>
                ))}
                {attraction.foodStyles?.map((style) => (
                  <span key={style} className={styles.chip}>
                    <UtensilsCrossed size={14} aria-hidden="true" />
                    {style}
                  </span>
                ))}
                {statusChips.map(({ key, icon: Icon, label, tone }) => (
                  <span
                    key={key}
                    className={`${styles.chip} ${tone === "danger" ? styles.statusChipDanger : styles.statusChip}`}
                  >
                    <Icon size={14} aria-hidden="true" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Own-trip usage — private per-user signal, not shown to anonymous viewers */}
          {attraction.usedInTripNames && attraction.usedInTripNames.length > 0 && (
            <p
              className={styles.usedInTripsBadge}
              title={attraction.usedInTripNames.length > 1 ? attraction.usedInTripNames.join(", ") : undefined}
            >
              <Luggage size={13} aria-hidden="true" />
              {attraction.usedInTripNames.length === 1
                ? `Already in your trip "${attraction.usedInTripNames[0]}"`
                : `Already in ${attraction.usedInTripNames.length} of your trips`}
            </p>
          )}

          {/* Nesting — structural facts about the attraction itself (not per-user, unlike
              the visited/used-in-trip signals above), so shown to every viewer. */}
          {attraction.parentAttractionId && attraction.parentAttractionName && (
            onNavigateToAttraction ? (
              <button
                type="button"
                className={`${styles.parentBadge} ${styles.parentBadgeButton}`}
                onClick={handleOpenParent}
                title={`View "${attraction.parentAttractionName}"`}
              >
                <Building2 size={13} aria-hidden="true" />
                Part of &quot;{attraction.parentAttractionName}&quot;
              </button>
            ) : (
              <p className={styles.parentBadge}>
                <Building2 size={13} aria-hidden="true" />
                Part of &quot;{attraction.parentAttractionName}&quot;
              </p>
            )
          )}
          {!!attraction.childAttractionCount && attraction.childAttractionCount > 0 && (
            <div className={styles.childrenSection}>
              <button
                type="button"
                className={styles.childCountBadge}
                onClick={handleToggleChildren}
                aria-expanded={childrenExpanded}
              >
                <Layers size={13} aria-hidden="true" />
                Contains {attraction.childAttractionCount} place{attraction.childAttractionCount === 1 ? "" : "s"}
              </button>
              {childrenExpanded && (
                <div className={styles.childrenList}>
                  {childrenLoading ? (
                    <div className={styles.childrenLoading}>
                      <Spinner variant="icon" iconSize={14} />
                    </div>
                  ) : (
                    <>
                      {paginatedChildren?.map((child) => {
                        const childIcon = renderTypeIcon(findType(child.types?.[0] ?? "")?.icon ?? "Globe");
                        const rowContent = (
                          <>
                            <span className={styles.childRowIcon} aria-hidden="true">{childIcon}</span>
                            <span className={styles.childRowName}>{child.name}</span>
                          </>
                        );
                        return onNavigateToAttraction ? (
                          <button
                            type="button"
                            key={child._id}
                            className={`${styles.childRow} ${styles.childRowButton}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToAttraction(child);
                            }}
                            aria-label={`View details for ${child.name}`}
                          >
                            {rowContent}
                          </button>
                        ) : (
                          <div key={child._id} className={styles.childRow}>
                            {rowContent}
                          </div>
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
            </div>
          )}

          {/* Other branches of the same chain in the same city (McDonald's, Adidas, etc.) —
              not shown for residences/flights (the "chain" concept doesn't apply) or when
              there's no city to scope the search to. */}
          {!isResidence && !isFlight && attraction.city && (
            <div className={styles.childrenSection}>
              <button
                type="button"
                className={styles.childCountBadge}
                onClick={handleToggleOtherLocations}
                aria-expanded={otherLocationsExpanded}
              >
                <MapPin size={13} aria-hidden="true" />
                Other locations in {attraction.city}
              </button>
              {otherLocationsExpanded && (
                <div className={styles.childrenList}>
                  {otherLocationsLoading ? (
                    <div className={styles.childrenLoading}>
                      <Spinner variant="icon" iconSize={14} />
                    </div>
                  ) : otherLocations?.length === 0 ? (
                    <p className={styles.emptyChildrenNote}>
                      No other locations found in {attraction.city}
                    </p>
                  ) : (
                    <>
                      {paginatedOtherLocations?.map((other) => {
                        const otherIcon = renderTypeIcon(findType(other.types?.[0] ?? "")?.icon ?? "Globe");
                        const rowContent = (
                          <>
                            <span className={styles.childRowIcon} aria-hidden="true">{otherIcon}</span>
                            <span className={styles.childRowName}>{other.name}</span>
                            {other.parentAttractionName && (
                              <span className={styles.otherLocationParent}>({other.parentAttractionName})</span>
                            )}
                          </>
                        );
                        return onNavigateToAttraction ? (
                          <button
                            type="button"
                            key={other._id}
                            className={`${styles.childRow} ${styles.childRowButton}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToAttraction(other);
                            }}
                            aria-label={`View details for ${other.name}`}
                          >
                            {rowContent}
                          </button>
                        ) : (
                          <div key={other._id} className={styles.childRow}>
                            {rowContent}
                          </div>
                        );
                      })}
                      {otherLocationsTotalPages > 1 && (
                        <div className={styles.childrenPagination}>
                          <button
                            type="button"
                            className={styles.childrenPageBtn}
                            onClick={stopAndPage(() => setOtherLocationsPage((p) => p - 1))}
                            disabled={otherLocationsPage === 1}
                            aria-label="Previous locations"
                          >
                            <ChevronLeft size={12} aria-hidden="true" />
                          </button>
                          <span className={styles.childrenPageInfo}>{otherLocationsPage} / {otherLocationsTotalPages}</span>
                          <button
                            type="button"
                            className={styles.childrenPageBtn}
                            onClick={stopAndPage(() => setOtherLocationsPage((p) => p + 1))}
                            disabled={otherLocationsPage === otherLocationsTotalPages}
                            aria-label="Next locations"
                          >
                            <ChevronRight size={12} aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Location map — shown whenever coordinates exist */}
          {attraction.coordinates && (
            <div className={styles.locationMapSection}>
              <div className={styles.locationMapContainer}>
                <LocationViewMap lat={attraction.coordinates.lat} lng={attraction.coordinates.lng} />
              </div>
              <p className={styles.locationCaption}>
                <MapPin size={11} aria-hidden="true" />
                {[attraction.city, attraction.country].filter(Boolean).join(", ")}
                <span className={styles.locationCoords}>
                  {attraction.coordinates.lat.toFixed(5)}, {attraction.coordinates.lng.toFixed(5)}
                </span>
              </p>
            </div>
          )}

          {/* Info grid */}
          <div className={styles.infoGrid}>
            {/* ── Residence-specific fields ── */}
            {/* residenceType is deliberately not repeated here — it's already shown as
                a type chip in the Types row above (types=[residenceType] for residences),
                so a second "Type" info item here would just duplicate it. */}
            {isResidence && attraction.checkInDate && (
              <div className={styles.infoItem}>
                <span className={styles.infoIconBubble}><Calendar size={15} aria-hidden="true" /></span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>Check-in</span>
                  <span className={styles.infoValue}>{formatDisplayDate(attraction.checkInDate)}</span>
                </span>
              </div>
            )}
            {isResidence && attraction.checkOutDate && (
              <div className={styles.infoItem}>
                <span className={styles.infoIconBubble}><Calendar size={15} aria-hidden="true" /></span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>Check-out</span>
                  <span className={styles.infoValue}>{formatDisplayDate(attraction.checkOutDate)}</span>
                </span>
              </div>
            )}

            {/* ── Flight-specific fields ── */}
            {isFlight && attraction.flightNumber && (
              <div className={styles.infoItem}>
                <span className={styles.infoIconBubble}><Plane size={15} aria-hidden="true" /></span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>Flight</span>
                  <span className={styles.infoValue}>{attraction.flightNumber}</span>
                </span>
              </div>
            )}
            {isFlight && attraction.airline && (
              <div className={styles.infoItem}>
                <span className={styles.infoIconBubble}><Tag size={15} aria-hidden="true" /></span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>Airline</span>
                  <span className={styles.infoValue}>{attraction.airline}</span>
                </span>
              </div>
            )}
            {isFlight && attraction.departureAirport && (
              <div className={styles.infoItem}>
                <span className={styles.infoIconBubble}><MapPin size={15} aria-hidden="true" /></span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>From</span>
                  <span className={styles.infoValue}>
                    {attraction.departureAirport}
                    {attraction.departureTime && (
                      <span className={styles.timeNote}> · {attraction.departureTime.split("T")[1]?.slice(0, 5)}</span>
                    )}
                  </span>
                </span>
              </div>
            )}
            {isFlight && attraction.arrivalAirport && (
              <div className={styles.infoItem}>
                <span className={styles.infoIconBubble}><MapPin size={15} aria-hidden="true" /></span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>To</span>
                  <span className={styles.infoValue}>
                    {attraction.arrivalAirport}
                    {attraction.arrivalTime && (
                      <span className={styles.timeNote}> · {attraction.arrivalTime.split("T")[1]?.slice(0, 5)}</span>
                    )}
                  </span>
                </span>
              </div>
            )}
            {isFlight && attraction.gate && (
              <div className={styles.infoItem}>
                <span className={styles.infoIconBubble}><MapPin size={15} aria-hidden="true" /></span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>Gate</span>
                  <span className={styles.infoValue}>{attraction.gate}</span>
                </span>
              </div>
            )}
            {isFlight && attraction.seat && (
              <div className={styles.infoItem}>
                <span className={styles.infoIconBubble}><Tag size={15} aria-hidden="true" /></span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>Seat</span>
                  <span className={styles.infoValue}>{attraction.seat}</span>
                </span>
              </div>
            )}

            {/* City/Country: already shown in the map caption below when coordinates exist — only
                shown here as a fallback so the info isn't lost when there's no map. */}
            {!isFlight && !attraction.coordinates && (
              <div className={styles.infoItem}>
                <span className={styles.infoIconBubble}><Building2 size={15} aria-hidden="true" /></span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>City</span>
                  <span className={styles.infoValue}>{attraction.city}</span>
                </span>
              </div>
            )}
            {!isFlight && !attraction.coordinates && (
              <div className={styles.infoItem}>
                <span className={styles.infoIconBubble}><Globe size={15} aria-hidden="true" /></span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>Country</span>
                  <span className={styles.infoValue}>{attraction.country}</span>
                </span>
              </div>
            )}
            {!isResidence && !isFlight && durationLabel && (
              <div className={styles.infoItem}>
                <span className={styles.infoIconBubble}><Clock size={15} aria-hidden="true" /></span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>Duration</span>
                  <span className={styles.infoValue}>{durationLabel}</span>
                </span>
              </div>
            )}
            {attraction.price != null && !hasMultiplePriceTiers && (
              <div className={styles.infoItem}>
                <span className={styles.infoIconBubble}><Wallet size={15} aria-hidden="true" /></span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>Price</span>
                  <span className={styles.infoValue}>{formatPrice(attraction.price!, attraction.currency ?? "USD")}</span>
                </span>
              </div>
            )}
            {/* Same hours every day of the week — a full day-by-day table would just repeat
                one value seven times, so fold it into a single info item instead. */}
            {!isResidence && !isFlight && uniformHoursLabel && !hoursCoveredByChip && (
              <div className={styles.infoItem}>
                <span className={styles.infoIconBubble}><Clock size={15} aria-hidden="true" /></span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>Hours</span>
                  <span className={styles.infoValue}>{uniformHoursLabel}</span>
                </span>
              </div>
            )}
            {/* Coordinates shown in the map caption above — removed from info grid */}
          </div>

          {/* Prices — broken out of the info grid into its own table, same pattern as
              Opening Hours below, once there's more than one tier to compare (a single
              price stays in the compact info-item above). */}
          {hasMultiplePriceTiers && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <Wallet size={14} aria-hidden="true" />
                Prices
              </h3>
              <div className={styles.hoursCard}>
                <table className={styles.hoursTable} aria-label="Price tiers">
                  <tbody>
                    {attraction.prices!.map((tier) => (
                      <tr key={tier.label} className={`${styles.hoursRow} ${tier.isPrimary ? styles.hoursRowToday : ""}`}>
                        <td className={styles.hoursDay}>
                          <span className={styles.hoursDayInner}>
                            {tier.label}
                            {tier.isPrimary && <span className={styles.todayPill}>Primary</span>}
                          </span>
                        </td>
                        <td className={styles.hoursTime}>{formatPrice(tier.amount, attraction.currency ?? "USD")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Opening hours — not shown for subtypes. When a status chip (24/7, and
              later permanently-closed) already covers the situation — shown up in the
              Types row instead — the day-by-day table and its heading would be
              redundant, so this section is skipped entirely. Same-every-day hours are
              shown as a compact info item above instead of this full table. */}
          {!isResidence && !isFlight && attraction.openingHours && !hoursCoveredByChip && !uniformHoursLabel && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <Clock size={14} aria-hidden="true" />
                Opening Hours
              </h3>
              <div className={styles.hoursCard}>
                <table className={styles.hoursTable} aria-label="Opening hours">
                  <tbody>
                    {DAY_KEYS.map((day) => {
                      const row = attraction.openingHours?.[day];
                      const isToday = day === todayKey;
                      return (
                        <tr key={day} className={`${styles.hoursRow} ${isToday ? styles.hoursRowToday : ""}`}>
                          <td className={styles.hoursDay}>
                            <span className={styles.hoursDayInner}>
                              {day}
                              {isToday && <span className={styles.todayPill}>Today</span>}
                            </span>
                          </td>
                          <td className={styles.hoursTime}>
                            {row?.closed || !row?.ranges?.length ? (
                              <span className={styles.closed}>Closed</span>
                            ) : (
                              row.ranges.map((r) => `${r.open} – ${r.close}`).join(", ")
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {attraction.notes && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <FileText size={14} aria-hidden="true" />
                Notes
              </h3>
              <p className={styles.notes}>{attraction.notes}</p>
            </div>
          )}

          {/* Photo URL (no preview — just show it's set) */}
          {attraction.photoUrl && !attraction.photoUrl.startsWith("http") && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <ImageIcon size={14} aria-hidden="true" />
                Photo URL
              </h3>
              <p className={`${styles.notes} ${styles.mono}`}>{attraction.photoUrl}</p>
            </div>
          )}
        </div>

        {(onEditTime || (canEdit && onEdit) || onAddToTrip || onRemoveFromTrip || (canEdit && onDelete)) && (
          <div className={styles.footer}>
            {onAddToTrip && (
              <button
                type="button"
                className={styles.editTimeBtn}
                onClick={() => { onAddToTrip(); onClose(); }}
                title="Add to my trip"
                aria-label={`Add ${attraction.name} to my trip`}
              >
                <Plus size={16} aria-hidden="true" />
              </button>
            )}
            {canEdit && onEdit && (
              <button
                type="button"
                className={styles.editTimeBtn}
                onClick={() => { onEdit(); onClose(); }}
                title="Edit attraction"
                aria-label={`Edit ${attraction.name}`}
              >
                <Pencil size={16} aria-hidden="true" />
              </button>
            )}
            {onEditTime && (
              <button
                type="button"
                className={styles.editTimeBtn}
                onClick={() => { onEditTime(); onClose(); }}
                title="Edit time & duration"
                aria-label={`Edit time and duration for ${attraction.name}`}
              >
                <Timer size={16} aria-hidden="true" />
              </button>
            )}
            {onRemoveFromTrip && (
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => { onRemoveFromTrip(); onClose(); }}
                title="Remove from trip"
                aria-label={`Remove ${attraction.name} from trip`}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            )}
            {canEdit && onDelete && (
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => { onDelete(); onClose(); }}
                title="Delete attraction"
                aria-label={`Delete ${attraction.name}`}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
