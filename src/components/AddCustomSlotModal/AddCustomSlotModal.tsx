"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X, Clock3, Tag, Calendar, Clock, Wallet, FileText, Layers, AlertCircle, Loader2, Check,
} from "lucide-react";
import { CurrencySelect } from "@/components/CurrencySelect/CurrencySelect";
import { AttractionTypePicker } from "@/components/AttractionTypePicker/AttractionTypePicker";
import type { AddCustomSlotModalProps, CustomSlotFormData } from "./AddCustomSlotModal.types";
import styles from "./AddCustomSlotModal.module.css";

const HEADING_ID = "add-custom-slot-modal-title";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

interface FieldErrors {
  name?: string;
  plannedDate?: string;
  plannedTime?: string;
}

function toDateValue(isoString: string): string {
  try { return new Date(isoString).toISOString().split("T")[0]; } catch { return ""; }
}

export function AddCustomSlotModal({
  isOpen, onClose, onSave,
  tripStartDate, tripEndDate, currency,
  initialData,
}: AddCustomSlotModalProps) {
  const isEditMode = !!initialData;

  const [name, setName]                   = useState("");
  const [plannedDate, setPlannedDate]     = useState("");
  const [plannedTime, setPlannedTime]     = useState("");
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit]   = useState<"hours" | "minutes">("hours");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [price, setPrice]                 = useState<number | null>(null);
  const [priceCurrency, setPriceCurrency] = useState(currency ?? "USD");
  const [notes, setNotes]                 = useState("");
  const [errors, setErrors]               = useState<FieldErrors>({});
  const [touched, setTouched]             = useState<Record<string, boolean>>({});
  const [saving, setSaving]               = useState(false);
  const [mounted, setMounted]             = useState(false);

  const dialogRef     = useRef<HTMLDivElement>(null);
  const triggerRef    = useRef<HTMLElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isOpen) return;
    setName(initialData?.name ?? "");
    setPlannedDate(initialData?.plannedDate ?? "");
    setPlannedTime(initialData?.plannedTime ?? "");
    setDurationValue(initialData?.actualDurationValue ?? "");
    setDurationUnit(initialData?.actualDurationUnit ?? "hours");
    setSelectedTypes(initialData?.types ?? []);
    setPrice(initialData?.price ?? null);
    setPriceCurrency(initialData?.currency ?? currency ?? "USD");
    setNotes(initialData?.notes ?? "");
    setErrors({});
    setTouched({});
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => firstInputRef.current?.focus());
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      triggerRef.current?.focus();
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "Tab" && dialogRef.current) {
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const tripStart = toDateValue(tripStartDate);
  const tripEnd   = toDateValue(tripEndDate);

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!name.trim()) {
      errs.name = "Label is required";
    }
    if (!plannedDate) {
      errs.plannedDate = "Date is required";
    } else if ((tripStart && plannedDate < tripStart) || (tripEnd && plannedDate > tripEnd)) {
      errs.plannedDate = "Date must be within the trip dates";
    }
    if (!plannedTime) errs.plannedTime = "Start time is required";
    return errs;
  }

  function toggleType(type: string) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function handleBlur(field: keyof FieldErrors) {
    setTouched((p) => ({ ...p, [field]: true }));
    setErrors(validate());
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleSave() {
    setTouched({ name: true, plannedDate: true, plannedTime: true });
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    const data: CustomSlotFormData = {
      name: name.trim(),
      plannedDate,
      plannedTime,
      actualDurationValue: durationValue || undefined,
      actualDurationUnit:  durationValue ? durationUnit : undefined,
      types: selectedTypes,
      price,
      currency: priceCurrency,
      notes: notes || undefined,
    };
    await Promise.resolve(onSave(data));
    setSaving(false);
    onClose();
  }

  if (!mounted || !isOpen) return null;

  const formIsValid = Object.keys(validate()).length === 0;

  const modal = (
    <div className={styles.backdrop} onClick={handleBackdropClick} aria-hidden="true">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={HEADING_ID}
        className={styles.container}
        aria-hidden="false"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id={HEADING_ID} className={styles.title}>
            <Clock3 size={18} aria-hidden="true" className={styles.titleIcon} />
            {isEditMode ? "Edit Custom Time-Slot" : "Add Custom Time-Slot"}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.body}>

          {/* Label */}
          <div className={styles.field}>
            <label htmlFor="slot-name" className={styles.labelWithIcon}>
              <Tag size={14} aria-hidden="true" />
              Label <span className={styles.required} aria-hidden="true">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="slot-name"
              type="text"
              placeholder="e.g. Lunch break, Metro to hotel, Check-in"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => handleBlur("name")}
              className={`${styles.input} ${touched.name && errors.name ? styles.inputError : ""}`}
              aria-required="true"
              aria-describedby={touched.name && errors.name ? "slot-err-name" : undefined}
            />
            {touched.name && errors.name && (
              <p id="slot-err-name" className={styles.errorMsg} role="alert">
                <AlertCircle size={12} aria-hidden="true" />{errors.name}
              </p>
            )}
          </div>

          {/* Date + Time */}
          <div className={styles.dateTimeRow}>
            <div className={styles.field}>
              <label htmlFor="slot-date" className={styles.labelWithIcon}>
                <Calendar size={14} aria-hidden="true" />
                Date <span className={styles.required} aria-hidden="true">*</span>
              </label>
              <input
                id="slot-date"
                type="date"
                value={plannedDate}
                min={tripStart}
                max={tripEnd}
                onChange={(e) => setPlannedDate(e.target.value)}
                onBlur={() => handleBlur("plannedDate")}
                className={`${styles.input} ${touched.plannedDate && errors.plannedDate ? styles.inputError : ""}`}
                aria-required="true"
                aria-describedby={touched.plannedDate && errors.plannedDate ? "slot-err-date" : undefined}
              />
              {touched.plannedDate && errors.plannedDate && (
                <p id="slot-err-date" className={styles.errorMsg} role="alert">
                  <AlertCircle size={12} aria-hidden="true" />{errors.plannedDate}
                </p>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="slot-time" className={styles.labelWithIcon}>
                <Clock size={14} aria-hidden="true" />
                Start time <span className={styles.required} aria-hidden="true">*</span>
              </label>
              <input
                id="slot-time"
                type="time"
                value={plannedTime}
                onChange={(e) => setPlannedTime(e.target.value)}
                onBlur={() => handleBlur("plannedTime")}
                className={`${styles.input} ${touched.plannedTime && errors.plannedTime ? styles.inputError : ""}`}
                aria-required="true"
                aria-describedby={touched.plannedTime && errors.plannedTime ? "slot-err-time" : undefined}
              />
              {touched.plannedTime && errors.plannedTime && (
                <p id="slot-err-time" className={styles.errorMsg} role="alert">
                  <AlertCircle size={12} aria-hidden="true" />{errors.plannedTime}
                </p>
              )}
            </div>
          </div>

          {/* Duration */}
          <div className={styles.field}>
            <label className={styles.labelWithIcon}>
              <Clock size={14} aria-hidden="true" />
              Duration
            </label>
            <div className={styles.durationRow}>
              <input
                id="slot-dur-value"
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g. 1.5"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                className={styles.input}
                aria-label="Duration value"
              />
              <select
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as "hours" | "minutes")}
                className={styles.durationUnit}
                aria-label="Duration unit"
              >
                <option value="hours">hours</option>
                <option value="minutes">minutes</option>
              </select>
            </div>
          </div>

          {/* Type (optional) */}
          <div className={styles.field}>
            <span id="slot-types-label" className={styles.labelWithIcon}>
              <Layers size={14} aria-hidden="true" />
              Type
            </span>
            <AttractionTypePicker
              selectedTypes={selectedTypes}
              onToggle={toggleType}
              labelId="slot-types-label"
            />
          </div>

          {/* Price */}
          <div className={styles.field}>
            <label className={styles.labelWithIcon}>
              <Wallet size={14} aria-hidden="true" />
              Price
            </label>
            <div className={styles.priceRow}>
              <CurrencySelect value={priceCurrency} onChange={setPriceCurrency} />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={price ?? ""}
                onChange={(e) => setPrice(e.target.value === "" ? null : parseFloat(e.target.value))}
                className={styles.priceInput}
                aria-label="Price amount"
              />
            </div>
          </div>

          {/* Notes */}
          <div className={styles.field}>
            <label htmlFor="slot-notes" className={styles.labelWithIcon}>
              <FileText size={14} aria-hidden="true" />
              Notes
            </label>
            <textarea
              id="slot-notes"
              rows={3}
              placeholder="e.g. Pre-booked restaurant, bring confirmation email"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={styles.textarea}
            />
          </div>

        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            <X size={15} aria-hidden="true" />
            Cancel
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || (!formIsValid && Object.keys(touched).length > 0)}
            aria-disabled={saving}
          >
            {saving ? (
              <><Loader2 size={15} className={styles.spinner} aria-hidden="true" />Saving…</>
            ) : (
              <><Check size={15} aria-hidden="true" />{isEditMode ? "Save Changes" : "Add Time-Slot"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
