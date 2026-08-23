"use client";

import { useState, useEffect } from "react";
import { ArrowLeftRight, Calendar, AlertCircle, Loader2, Check } from "lucide-react";
import { ModalShell } from "@/components/Modal";
import { formatDayLabel } from "@/lib";
import type { SwapDaysModalProps } from "./SwapDaysModal.types";
import styles from "./SwapDaysModal.module.css";

const HEADING_ID = "swap-days-modal-title";

export function SwapDaysModal({ isOpen, onClose, days, onSwap }: SwapDaysModalProps) {
  const [dayA, setDayA] = useState("");
  const [dayB, setDayB] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDayA(days[0] ?? "");
    setDayB(days[1] ?? "");
    setSaving(false);
  }, [isOpen, days]);

  const sameDay = !!dayA && dayA === dayB;
  const canSwap = !!dayA && !!dayB && !sameDay;

  async function handleSwap() {
    if (!canSwap) return;
    setSaving(true);
    try {
      await onSwap(dayA, dayB);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      styles={styles}
      headingId={HEADING_ID}
      header={
        <h2 id={HEADING_ID} className={styles.title}>
          <ArrowLeftRight size={18} aria-hidden="true" className={styles.titleIcon} />
          Swap Days
        </h2>
      }
      footer={
        <>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSwap}
            disabled={saving || !canSwap}
          >
            {saving ? (
              <><Loader2 size={15} className={styles.spinner} aria-hidden="true" />Swapping…</>
            ) : (
              <><Check size={15} aria-hidden="true" />Swap</>
            )}
          </button>
        </>
      }
    >
      <p className={styles.helperText}>
        Everything scheduled on these two days — attractions, custom time-slots, flights —
        swaps places. Times of day stay the same; only the dates change.
      </p>

      <div className={styles.field}>
        <label htmlFor="swap-day-a" className={styles.labelWithIcon}>
          <Calendar size={14} aria-hidden="true" />
          Day A
        </label>
        <select
          id="swap-day-a"
          value={dayA}
          onChange={(e) => setDayA(e.target.value)}
          className={styles.select}
        >
          {days.map((d) => (
            <option key={d} value={d}>{formatDayLabel(d)}</option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="swap-day-b" className={styles.labelWithIcon}>
          <Calendar size={14} aria-hidden="true" />
          Day B
        </label>
        <select
          id="swap-day-b"
          value={dayB}
          onChange={(e) => setDayB(e.target.value)}
          className={styles.select}
        >
          {days.map((d) => (
            <option key={d} value={d}>{formatDayLabel(d)}</option>
          ))}
        </select>
      </div>

      {sameDay && (
        <p className={styles.errorMsg} role="alert">
          <AlertCircle size={12} aria-hidden="true" />Pick two different days.
        </p>
      )}
    </ModalShell>
  );
}
