"use client";

import { useEffect, useState } from "react";
import { Loader2, Clock, Wallet, CheckCircle2 } from "lucide-react";
import { ModalShell } from "@/components/Modal";
import { compareDayAlternatives } from "@/services";
import type { DayAlternativeCompareVersion } from "@/services";
import { formatDayLabel, formatPrice } from "@/lib";
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

/** Read-only side-by-side comparison of every version of one day — the main schedule
 *  plus every alternative ever created for it — opened from the GitBranch icon in the
 *  day's switcher row. Fetches its own data (not the live-resolved attractions array,
 *  which only ever reflects the ACTIVE version per day) so every version shows at once,
 *  regardless of which one is currently live. */
export function DayAlternativesCompareModal({ isOpen, onClose, tripId, token, day, tripCurrency }: DayAlternativesCompareModalProps) {
  const [versions, setVersions] = useState<DayAlternativeCompareVersion[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!isOpen) { setVersions(null); setLoadError(false); return; }
    let cancelled = false;
    compareDayAlternatives(tripId, token, day)
      .then((data) => { if (!cancelled) setVersions(data); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [isOpen, tripId, token, day]);

  return (
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
                {v.isActive && (
                  <span className={styles.activeBadge}>
                    <CheckCircle2 size={11} aria-hidden="true" />
                    Active
                  </span>
                )}
              </div>
              {v.items.length === 0 ? (
                <p className={styles.emptyText}>Nothing scheduled.</p>
              ) : (
                <ul className={styles.itemList}>
                  {v.items.map((item) => (
                    <li key={item.key} className={styles.item}>
                      <span className={styles.itemTime}>
                        <Clock size={11} aria-hidden="true" />
                        {item.plannedTime ?? "—"}
                      </span>
                      <span className={styles.itemName}>{item.name}</span>
                      {item.price != null && (
                        <span className={styles.itemPrice}>
                          <Wallet size={11} aria-hidden="true" />
                          {formatPrice(item.price, item.currency ?? tripCurrency ?? "USD")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}
