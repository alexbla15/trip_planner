"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, MapPinned, Globe, Loader2, AlertCircle } from "lucide-react";
import { listTrips } from "@/services";
import { formatDisplayDate } from "@/lib";
import type { Trip } from "@/types/trip";
import styles from "./TripPickerModal.module.css";

const HEADING_ID = "trip-picker-title";

export interface TripPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (trip: Trip) => void;
  token: string | null;
  /** Only trips in this country are shown/selectable — an attraction is tied to a
   *  specific place, so it can only be added to a trip that's actually going there. */
  country: string;
}

export function TripPickerModal({ isOpen, onClose, onSelect, token, country }: TripPickerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const matchingTrips = trips.filter((t) => t.country === country);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen || !token) return;
    setLoading(true);
    setLoadError(false);
    listTrips(token)
      .then((data) => setTrips(Array.isArray(data) ? (data as Trip[]) : []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [isOpen, token]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  if (!mounted || !isOpen) return null;

  const modal = (
    <div className={styles.backdrop} onClick={handleBackdropClick} aria-hidden="true">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={HEADING_ID}
        className={styles.container}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id={HEADING_ID} className={styles.title}>
            <MapPinned size={18} className={styles.titleIcon} aria-hidden="true" />
            Add to a Trip
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.body}>
          {loading ? (
            <div className={styles.center}><Loader2 size={28} className={styles.spin} aria-hidden="true" /></div>
          ) : loadError ? (
            <div className={styles.emptyState}>
              <AlertCircle size={28} className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyHeading}>Couldn&apos;t load your trips</p>
              <p className={styles.emptyBody}>Please try again.</p>
            </div>
          ) : trips.length === 0 ? (
            <div className={styles.emptyState}>
              <Globe size={28} className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyHeading}>No trips yet</p>
              <p className={styles.emptyBody}>Create a trip first, then come back to add this attraction to it.</p>
            </div>
          ) : matchingTrips.length === 0 ? (
            <div className={styles.emptyState}>
              <Globe size={28} className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyHeading}>No trips to {country}</p>
              <p className={styles.emptyBody}>
                This attraction is in {country} — none of your trips are going there yet.
              </p>
            </div>
          ) : (
            <ul className={styles.list} role="listbox" aria-label="Your trips">
              {matchingTrips.map((trip) => (
                <li key={trip._id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    className={styles.item}
                    onClick={() => onSelect(trip)}
                  >
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>{trip.name}</span>
                      <span className={styles.itemMeta}>
                        {trip.country}
                        {trip.startDate && trip.endDate
                          ? ` · ${formatDisplayDate(trip.startDate)} – ${formatDisplayDate(trip.endDate)}`
                          : ""}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            <X size={15} aria-hidden="true" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
