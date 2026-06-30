"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
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
} from "lucide-react";
import { ICONS } from "@/components/NewAttractionModal/AttractionTypeChip";
import type { AttractionType } from "@/components/NewAttractionModal/attraction.types";
import type { Attraction } from "@/types/attraction";
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

  const firstType = attraction.types?.[0] as AttractionType | undefined;
  const typeIcon = firstType ? ICONS[firstType] : null;

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

          {/* Info grid */}
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>
                <Building2 size={13} aria-hidden="true" />
                City
              </span>
              <span className={styles.infoValue}>{attraction.city}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>
                <Globe size={13} aria-hidden="true" />
                Country
              </span>
              <span className={styles.infoValue}>{attraction.country}</span>
            </div>
            {durationLabel && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <Clock size={13} aria-hidden="true" />
                  Duration
                </span>
                <span className={styles.infoValue}>{durationLabel}</span>
              </div>
            )}
            {attraction.price != null && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <Wallet size={13} aria-hidden="true" />
                  Price
                </span>
                <span className={styles.infoValue}>${attraction.price}</span>
              </div>
            )}
            {attraction.coordinates && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <Navigation size={13} aria-hidden="true" />
                  Coordinates
                </span>
                <span className={`${styles.infoValue} ${styles.mono}`}>
                  {attraction.coordinates.lat.toFixed(4)}, {attraction.coordinates.lng.toFixed(4)}
                </span>
              </div>
            )}
          </div>

          {/* Opening hours */}
          {attraction.openingHours && (
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
