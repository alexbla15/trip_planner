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
} from "lucide-react";
import { renderTypeIcon } from "@/components/IconPicker";
import { WebsiteLinkButton } from "@/components/WebsiteLinkButton";
import { useAttractionTypes } from "@/hooks";

const LocationViewMap = dynamic(
  () => import("./LocationViewMap").then((m) => ({ default: m.LocationViewMap })),
  { ssr: false, loading: () => <div className={styles.locationMapLoading} /> }
);
import type { AttractionType } from "@/components/NewAttractionModal";
import type { Attraction } from "@/types/attraction";
import { formatDisplayDate, formatPrice, getStatusChips } from "@/lib";
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
}

export function AttractionDetailModal({ attraction, onClose, onEditTime, canEdit, onEdit, onAddToTrip, onRemoveFromTrip, onDelete, onToggleVisited, isVisited }: AttractionDetailModalProps) {
  const { findType } = useAttractionTypes();
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

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
  const statusChips = getStatusChips(attraction.openingHours);

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
          {attraction.photoUrl?.startsWith("http") && (
            <div className={styles.photo}>
              <ImageWithSkeleton
                src={attraction.photoUrl}
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
          {(attraction.types?.length > 0 || statusChips.length > 0) && (
            <div className={styles.section}>
              <div className={styles.chips}>
                {attraction.types?.map((t) => (
                  <span key={t} className={styles.chip}>
                    {renderTypeIcon(findType(t)?.icon ?? "Globe")}
                    {t}
                  </span>
                ))}
                {statusChips.map(({ key, icon: Icon, label }) => (
                  <span key={key} className={`${styles.chip} ${styles.statusChip}`}>
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
            <p className={styles.parentBadge}>
              <Building2 size={13} aria-hidden="true" />
              Part of &quot;{attraction.parentAttractionName}&quot;
            </p>
          )}
          {!!attraction.childAttractionCount && attraction.childAttractionCount > 0 && (
            <p className={styles.childCountBadge}>
              <Layers size={13} aria-hidden="true" />
              Contains {attraction.childAttractionCount} place{attraction.childAttractionCount === 1 ? "" : "s"}
            </p>
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
            {isResidence && attraction.residenceType && (
              <div className={styles.infoItem}>
                <span className={styles.infoIconBubble}><BedDouble size={15} aria-hidden="true" /></span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>Type</span>
                  <span className={styles.infoValue}>{attraction.residenceType}</span>
                </span>
              </div>
            )}
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
            {attraction.price != null && (
              <div className={styles.infoItem}>
                <span className={styles.infoIconBubble}><Wallet size={15} aria-hidden="true" /></span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>Price</span>
                  <span className={styles.infoValue}>{formatPrice(attraction.price!, attraction.currency ?? "USD")}</span>
                </span>
              </div>
            )}
            {/* Coordinates shown in the map caption above — removed from info grid */}
          </div>

          {/* Opening hours — not shown for subtypes. When a status chip (24/7, and
              later permanently-closed) already covers the situation — shown up in the
              Types row instead — the day-by-day table and its heading would be
              redundant, so this section is skipped entirely. */}
          {!isResidence && !isFlight && attraction.openingHours && statusChips.length === 0 && (
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
