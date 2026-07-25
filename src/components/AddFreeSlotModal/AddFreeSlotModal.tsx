"use client";

import { useState, useEffect, useRef } from "react";
import {
  X, Coffee, Tag, Calendar, Clock, Wallet, FileText, Layers, AlertCircle, Loader2, Check,
} from "lucide-react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { AttractionTypePicker } from "@/components/AttractionTypePicker";
import { ModalShell } from "@/components/Modal";
import { toDateValue } from "@/lib";
import type { AddFreeSlotModalProps, FreeSlotFormData } from "./AddFreeSlotModal.types";
import styles from "./AddFreeSlotModal.module.css";

const HEADING_ID = "add-free-slot-modal-title";

interface FieldErrors {
  name?: string;
  plannedDate?: string;
  plannedTime?: string;
}

export function AddFreeSlotModal({
  isOpen, onClose, onSave,
  tripStartDate, tripEndDate, currency,
  initialData,
}: AddFreeSlotModalProps) {
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

  const firstInputRef = useRef<HTMLInputElement>(null);

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

  const tripStart = toDateValue(tripStartDate);
  const tripEnd   = toDateValue(tripEndDate);

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!name.trim())  errs.name       = "Label is required";
    if (!plannedDate)  errs.plannedDate = "Date is required";
    if (!plannedTime)  errs.plannedTime = "Start time is required";
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

  async function handleSave() {
    setTouched({ name: true, plannedDate: true, plannedTime: true });
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    const data: FreeSlotFormData = {
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

  const formIsValid = Object.keys(validate()).length === 0;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      styles={styles}
      headingId={HEADING_ID}
      initialFocusRef={firstInputRef}
      header={
        <h2 id={HEADING_ID} className={styles.title}>
          <Coffee size={18} aria-hidden="true" className={styles.titleIcon} />
          {isEditMode ? "Edit Free Slot" : "Add Free Slot"}
        </h2>
      }
      footer={
        <>
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
              <><Check size={15} aria-hidden="true" />{isEditMode ? "Save Changes" : "Add Slot"}</>
            )}
          </button>
        </>
      }
    >
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
    </ModalShell>
  );
}
