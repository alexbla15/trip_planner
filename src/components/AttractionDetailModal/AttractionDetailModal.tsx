"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
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
} from "lucide-react";
import { ICONS } from "@/components/NewAttractionModal/AttractionTypeChip";

const LocationViewMap = dynamic(
  () => import("./LocationViewMap").then((m) => ({ default: m.LocationViewMap })),
  { ssr: false, loading: () => <div className={styles.locationMapLoading} /> }
);
import type { AttractionType } from "@/components/NewAttractionModal/attraction.types";
import type { Attraction } from "@/types/attraction";
import { formatDisplayDate } from "@/lib/formatDate";
import styles from "./AttractionDetailModal.module.css";

const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

interface AttractionDetailModalProps {
  attraction: Attraction | null;
  onClose: () => void;
  onEditTime?: () => void;
}

export function AttractionDetailModal({ attraction, onClose, onEditTime }: AttractionDetailModalProps) {
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

  const firstType = attraction.types?.[0] as AttractionType | undefined;
  const typeIcon = isResidence && !firstType
    ? <BedDouble size={16} aria-hidden="true" />
    : firstType ? ICONS[firstType] : null;

  const durationLabel = attraction.durationValue
    ? `${attraction.durationValue} ${attraction.durationUnit ?? "hours"}`
    : null;

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
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Photo */}
          {attraction.photoUrl?.startsWith("http") && (
            <div className={styles.photo}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attraction.photoUrl}
                alt={`${attraction.name} photo`}
                className={styles.photoImg}
              />
            </div>
          )}

          {/* Types */}
          {attraction.types?.length > 0 && (
            <div className={styles.section}>
              <div className={styles.chips}>
                {attraction.types.map((t) => {
                  const icon = ICONS[t as AttractionType];
                  return (
                    <span key={t} className={styles.chip}>
                      {icon}
                      {t}
                    </span>
                  );
                })}
              </div>
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
            {isResidence && attraction.residenceType && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}><BedDouble size={13} aria-hidden="true" />Type</span>
                <span className={styles.infoValue}>{attraction.residenceType}</span>
              </div>
            )}
            {isResidence && attraction.checkInDate && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}><Calendar size={13} aria-hidden="true" />Check-in</span>
                <span className={styles.infoValue}>{formatDisplayDate(attraction.checkInDate)}</span>
              </div>
            )}
            {isResidence && attraction.checkOutDate && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}><Calendar size={13} aria-hidden="true" />Check-out</span>
                <span className={styles.infoValue}>{formatDisplayDate(attraction.checkOutDate)}</span>
              </div>
            )}

            {/* ── Flight-specific fields ── */}
            {isFlight && attraction.flightNumber && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}><Plane size={13} aria-hidden="true" />Flight</span>
                <span className={styles.infoValue}>{attraction.flightNumber}</span>
              </div>
            )}
            {isFlight && attraction.airline && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}><Tag size={13} aria-hidden="true" />Airline</span>
                <span className={styles.infoValue}>{attraction.airline}</span>
              </div>
            )}
            {isFlight && attraction.departureAirport && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}><MapPin size={13} aria-hidden="true" />From</span>
                <span className={styles.infoValue}>
                  {attraction.departureAirport}
                  {attraction.departureTime && (
                    <span className={styles.timeNote}> · {attraction.departureTime.split("T")[1]?.slice(0, 5)}</span>
                  )}
                </span>
              </div>
            )}
            {isFlight && attraction.arrivalAirport && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}><MapPin size={13} aria-hidden="true" />To</span>
                <span className={styles.infoValue}>
                  {attraction.arrivalAirport}
                  {attraction.arrivalTime && (
                    <span className={styles.timeNote}> · {attraction.arrivalTime.split("T")[1]?.slice(0, 5)}</span>
                  )}
                </span>
              </div>
            )}
            {isFlight && attraction.gate && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}><MapPin size={13} aria-hidden="true" />Gate</span>
                <span className={styles.infoValue}>{attraction.gate}</span>
              </div>
            )}
            {isFlight && attraction.seat && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}><Tag size={13} aria-hidden="true" />Seat</span>
                <span className={styles.infoValue}>{attraction.seat}</span>
              </div>
            )}

            {/* ── Generic fields (city/country/duration/coords shown for non-subtype; city/country always shown) ── */}
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}><Building2 size={13} aria-hidden="true" />City</span>
              <span className={styles.infoValue}>{attraction.city}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}><Globe size={13} aria-hidden="true" />Country</span>
              <span className={styles.infoValue}>{attraction.country}</span>
            </div>
            {!isResidence && !isFlight && durationLabel && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}><Clock size={13} aria-hidden="true" />Duration</span>
                <span className={styles.infoValue}>{durationLabel}</span>
              </div>
            )}
            {attraction.price != null && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}><Wallet size={13} aria-hidden="true" />Price</span>
                <span className={styles.infoValue}>${attraction.price}</span>
              </div>
            )}
            {/* Coordinates shown in the map caption above — removed from info grid */}
          </div>

          {/* Opening hours — not shown for subtypes */}
          {!isResidence && !isFlight && attraction.openingHours && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <Clock size={14} aria-hidden="true" />
                Opening Hours
              </h3>
              <table className={styles.hoursTable} aria-label="Opening hours">
                <tbody>
                  {DAY_KEYS.map((day) => {
                    const row = attraction.openingHours?.[day];
                    return (
                      <tr key={day} className={styles.hoursRow}>
                        <td className={styles.hoursDay}>{day}</td>
                        <td className={styles.hoursTime}>
                          {row?.closed ? (
                            <span className={styles.closed}>Closed</span>
                          ) : (
                            `${row?.open ?? "—"} – ${row?.close ?? "—"}`
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

        {onEditTime && (
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.editTimeBtn}
              onClick={() => { onEditTime(); onClose(); }}
            >
              <Timer size={14} aria-hidden="true" />
              Edit time &amp; duration
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
