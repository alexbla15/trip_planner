"use client";

import { useEffect, useState } from "react";
import { Loader2, Clock, Wallet, CheckCircle2 } from "lucide-react";
import { ModalShell } from "@/components/Modal";
import { AttractionDetailModal } from "@/components";
import { compareDayAlternatives, getAttraction } from "@/services";
import type { DayAlternativeCompareVersion, DayAlternativeCompareItem } from "@/services";
import { formatDayLabel, formatPrice, timeToMins } from "@/lib";
import type { Attraction } from "@/types/attraction";
import styles from "./DayAlternativesCompareModal.module.css";

const HEADING_ID = "day-alt-compare-title";

interface DayAlternativesCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  token: string;
  day: string;
  tripCurrency?: string;
}

/** "HH:MM" the item's duration ends at, e.g. "09:00–10:15" — null when there's no
 *  start time or duration to compute from (shown as just the start time instead). */
function endTimeLabel(item: DayAlternativeCompareItem): string | null {
  if (!item.plannedTime || !item.durationValue) return null;
  const val = parseFloat(item.durationValue);
  if (!val) return null;
  const mins = item.durationUnit === "minutes" ? val : val * 60;
  const end = timeToMins(item.plannedTime) + mins;
  const h = String(Math.floor((end % 1440) / 60)).padStart(2, "0");
  const m = String(Math.floor(end % 60)).padStart(2, "0");
  return `${h}:${m}`;
}

/** Builds a minimal Attraction-shaped object for a custom slot/flight item — there's no
 *  backing document to fetch, so the comparison item's own fields are all there is. */
function toScheduleOnlyAttraction(item: DayAlternativeCompareItem): Attraction {
  return {
    _id: item.key,
    ownerId: "",
    name: item.name,
    country: "",
    city: "",
    coordinates: null,
    types: item.subtype === "flight" ? ["Flight"] : [],
    price: item.price,
    currency: item.currency ?? "USD",
    subtype: item.subtype,
    plannedDate: null,
    plannedTime: item.plannedTime,
    actualDurationValue: item.durationValue,
    actualDurationUnit: item.durationUnit,
  } as Attraction;
}

/** Read-only side-by-side comparison of every version of one day — the main schedule
 *  plus every alternative ever created for it — opened from the GitBranch icon in the
 *  day's switcher row. Fetches its own data (not the live-resolved attractions array,
 *  which only ever reflects the ACTIVE version per day) so every version shows at once,
 *  regardless of which one is currently live. Each item opens its attraction's detail
 *  card (or, for a custom slot/flight with no backing document, a card built from the
 *  item's own fields) — read-only, same as this modal itself. */
export function DayAlternativesCompareModal({ isOpen, onClose, tripId, token, day, tripCurrency }: DayAlternativesCompareModalProps) {
  const [versions, setVersions] = useState<DayAlternativeCompareVersion[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [viewingAttraction, setViewingAttraction] = useState<Attraction | null>(null);
  const [viewingLoading, setViewingLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) { setVersions(null); setLoadError(false); return; }
    let cancelled = false;
    compareDayAlternatives(tripId, token, day)
      .then((data) => { if (!cancelled) setVersions(data); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [isOpen, tripId, token, day]);

  function handleOpenItem(item: DayAlternativeCompareItem) {
    if (!item.attractionId) {
      setViewingAttraction(toScheduleOnlyAttraction(item));
      return;
    }
    setViewingLoading(true);
    getAttraction(item.attractionId, token)
      .then((a) => setViewingAttraction(a as Attraction))
      .finally(() => setViewingLoading(false));
  }

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        styles={styles}
        headingId={HEADING_ID}
        header={
          <h2 id={HEADING_ID} className={styles.title}>
            Compare — {formatDayLabel(day)}
          </h2>
        }
      >
        {loadError ? (
          <p className={styles.errorText}>Couldn&apos;t load these schedules. Please try again.</p>
        ) : !versions ? (
          <div className={styles.placeholder}><Loader2 size={24} className={styles.spin} /></div>
        ) : (
          <div className={styles.columns}>
            {versions.map((v) => (
              <div key={v.id ?? "main"} className={`${styles.column} ${v.isActive ? styles.columnActive : ""}`}>
                <div className={styles.columnHeader}>
                  <span className={styles.columnName}>{v.name}</span>
                  {/* Always rendered (just hidden when inactive) so every column's header
                      reserves the same height — otherwise the active column's badge pushes
                      its items down relative to the others, misaligning the rows being
                      compared. */}
                  <span className={styles.activeBadge} style={!v.isActive ? { visibility: "hidden" } : undefined}>
                    <CheckCircle2 size={11} aria-hidden="true" />
                    Active
                  </span>
                </div>
                {v.items.length === 0 ? (
                  <p className={styles.emptyText}>Nothing scheduled.</p>
                ) : (
                  <ul className={styles.itemList}>
                    {v.items.map((item) => {
                      const endTime = endTimeLabel(item);
                      return (
                        <li key={item.key}>
                          <button type="button" className={styles.item} onClick={() => handleOpenItem(item)}>
                            <span className={styles.itemTime}>
                              <Clock size={11} aria-hidden="true" />
                              {item.plannedTime ? (endTime ? `${item.plannedTime}–${endTime}` : item.plannedTime) : "—"}
                            </span>
                            <span className={styles.itemName}>{item.name}</span>
                            {item.price != null && (
                              <span className={styles.itemPrice}>
                                <Wallet size={11} aria-hidden="true" />
                                {formatPrice(item.price, item.currency ?? tripCurrency ?? "USD")}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </ModalShell>

      {viewingLoading && (
        <div className={styles.viewingLoadingOverlay} aria-hidden="true">
          <Loader2 size={24} className={styles.spin} />
        </div>
      )}
      <AttractionDetailModal
        attraction={viewingAttraction}
        onClose={() => setViewingAttraction(null)}
      />
    </>
  );
}
