"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X, BedDouble, Tag, Globe, Building, Calendar, Wallet,
  FileText, ChevronDown, AlertCircle, Loader2, Check,
} from "lucide-react";
import { currencySymbol } from "@/lib/formatCurrency";
import { MapPicker } from "@/components/NewAttractionModal/MapPicker";
import type { Coordinates } from "@/components/NewAttractionModal/attraction.types";
import type { AddResidenceModalProps, ResidenceFormData, ResidenceType, ResidenceInitialData } from "./AddResidenceModal.types";
import styles from "./AddResidenceModal.module.css";

const HEADING_ID = "add-residence-modal-title";
const RESIDENCE_TYPES: ResidenceType[] = ["Hotel", "Apartment", "Hostel", "Villa", "Other"];

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
  residenceType?: string;
  checkInDate?: string;
  checkOutDate?: string;
}

function toDateValue(isoString: string): string {
  try { return new Date(isoString).toISOString().split("T")[0]; } catch { return ""; }
}

export function AddResidenceModal({
  isOpen, onClose, onSave,
  tripCountry, tripCity, tripStartDate, tripEndDate, currency,
  initialData,
}: AddResidenceModalProps) {
  const isEditMode = !!initialData;
  const [name, setName]                   = useState("");
  const [city, setCity]                   = useState(tripCity ?? "");
  const [residenceType, setResidenceType] = useState<ResidenceType>("Hotel");
  const [checkInDate, setCheckInDate]     = useState("");
  const [checkOutDate, setCheckOutDate]   = useState("");
  const [price, setPrice]                 = useState<number | null>(null);
  const [coordinates, setCoordinates]     = useState<Coordinates | null>(null);
  const [notes, setNotes]                 = useState("");
  const [errors, setErrors]               = useState<FieldErrors>({});
  const [touched, setTouched]             = useState<Record<string, boolean>>({});
  const [saving, setSaving]               = useState(false);
  const [mounted, setMounted]             = useState(false);

  const dialogRef    = useRef<HTMLDivElement>(null);
  const triggerRef   = useRef<HTMLElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isOpen) return;
    setName(initialData?.name ?? "");
    setCity(initialData?.city ?? tripCity ?? "");
    setResidenceType(initialData?.residenceType ?? "Hotel");
    setCheckInDate(initialData?.checkInDate ?? "");
    setCheckOutDate(initialData?.checkOutDate ?? "");
    setCoordinates(initialData?.coordinates ?? null);
    setPrice(initialData?.price ?? null);
    setNotes(initialData?.notes ?? "");
    setErrors({});
    setTouched({});
  }, [isOpen]); // intentionally omits initialData/tripCity — only sync when modal opens

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
    if (!name.trim())        errs.name          = "Name is required";
    if (!residenceType)      errs.residenceType  = "Residence type is required";
    if (!checkInDate)        errs.checkInDate    = "Check-in date is required";
    if (!checkOutDate)       errs.checkOutDate   = "Check-out date is required";
    else if (checkInDate && checkOutDate < checkInDate)
      errs.checkOutDate = "Check-out must be on or after check-in";
    return errs;
  }

  function handleBlur(field: keyof FieldErrors) {
    setTouched((p) => ({ ...p, [field]: true }));
    setErrors(validate());
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleSave() {
    setTouched({ name: true, residenceType: true, checkInDate: true, checkOutDate: true });
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    const data: ResidenceFormData = {
      name: name.trim(),
      country: tripCountry,
      city: city.trim() || tripCountry,
      coordinates,
      residenceType,
      checkInDate,
      checkOutDate,
      price,
      notes,
      types: residenceType !== "Other" ? [residenceType] : [],
      subtype: "residence",
    };
    await Promise.resolve(onSave(data));
    setSaving(false);
    onClose();
  }

  if (!mounted || !isOpen) return null;

  const formIsValid = Object.keys(validate()).length === 0;
  const currSym = currencySymbol(currency ?? "");

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
        {/* Header */}
        <div className={styles.header}>
          <h2 id={HEADING_ID} className={styles.title}>
            <BedDouble size={18} aria-hidden="true" className={styles.titleIcon} />
            {isEditMode ? "Edit Residence" : "Add Residence"}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* Name */}
          <div className={styles.field}>
            <label htmlFor="res-name" className={styles.labelWithIcon}>
              <Tag size={14} aria-hidden="true" />
              Name <span className={styles.required} aria-hidden="true">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="res-name"
              type="text"
              placeholder="e.g. Marriott Paris"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => handleBlur("name")}
              className={`${styles.input} ${touched.name && errors.name ? styles.inputError : ""}`}
              aria-required="true"
              aria-describedby={touched.name && errors.name ? "res-err-name" : undefined}
            />
            {touched.name && errors.name && (
              <p id="res-err-name" className={styles.errorMsg} role="alert">
                <AlertCircle size={12} aria-hidden="true" />{errors.name}
              </p>
            )}
          </div>

          {/* Residence type */}
          <div className={styles.field}>
            <label htmlFor="res-type" className={styles.labelWithIcon}>
              <BedDouble size={14} aria-hidden="true" />
              Type <span className={styles.required} aria-hidden="true">*</span>
            </label>
            <div className={styles.selectWrapper}>
              <select
                id="res-type"
                value={residenceType}
                onChange={(e) => setResidenceType(e.target.value as ResidenceType)}
                onBlur={() => handleBlur("residenceType")}
                className={`${styles.select} ${touched.residenceType && errors.residenceType ? styles.inputError : ""}`}
                aria-required="true"
              >
                {RESIDENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown size={16} className={styles.selectIcon} aria-hidden="true" />
            </div>
          </div>

          {/* Country (read-only) */}
          <div className={styles.field}>
            <span className={styles.labelWithIcon}>
              <Globe size={14} aria-hidden="true" />
              Country
            </span>
            <div className={styles.readOnlyField} aria-label={`Country: ${tripCountry} (locked to trip)`}>
              {tripCountry}
            </div>
          </div>

          {/* City */}
          <div className={styles.field}>
            <label htmlFor="res-city" className={styles.labelWithIcon}>
              <Building size={14} aria-hidden="true" />
              City
            </label>
            <input
              id="res-city"
              type="text"
              placeholder="e.g. Paris"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={styles.input}
            />
          </div>

          {/* Location pin */}
          <div className={styles.field}>
            <span className={styles.labelWithIcon}>
              <Globe size={14} aria-hidden="true" />
              Location
            </span>
            <MapPicker coordinates={coordinates} onChange={setCoordinates} />
          </div>

          {/* Dates row */}
          <div className={styles.datesRow}>
            <div className={styles.field}>
              <label htmlFor="res-checkin" className={styles.labelWithIcon}>
                <Calendar size={14} aria-hidden="true" />
                Check-in <span className={styles.required} aria-hidden="true">*</span>
              </label>
              <input
                id="res-checkin"
                type="date"
                value={checkInDate}
                min={tripStart}
                max={tripEnd}
                onChange={(e) => { setCheckInDate(e.target.value); if (checkOutDate && e.target.value > checkOutDate) setCheckOutDate(""); }}
                onBlur={() => handleBlur("checkInDate")}
                className={`${styles.input} ${touched.checkInDate && errors.checkInDate ? styles.inputError : ""}`}
                aria-required="true"
                aria-describedby={touched.checkInDate && errors.checkInDate ? "res-err-ci" : undefined}
              />
              {touched.checkInDate && errors.checkInDate && (
                <p id="res-err-ci" className={styles.errorMsg} role="alert">
                  <AlertCircle size={12} aria-hidden="true" />{errors.checkInDate}
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="res-checkout" className={styles.labelWithIcon}>
                <Calendar size={14} aria-hidden="true" />
                Check-out <span className={styles.required} aria-hidden="true">*</span>
              </label>
              <input
                id="res-checkout"
                type="date"
                value={checkOutDate}
                min={checkInDate || tripStart}
                max={tripEnd}
                onChange={(e) => setCheckOutDate(e.target.value)}
                onBlur={() => handleBlur("checkOutDate")}
                className={`${styles.input} ${touched.checkOutDate && errors.checkOutDate ? styles.inputError : ""}`}
                aria-required="true"
                aria-describedby={touched.checkOutDate && errors.checkOutDate ? "res-err-co" : undefined}
              />
              {touched.checkOutDate && errors.checkOutDate && (
                <p id="res-err-co" className={styles.errorMsg} role="alert">
                  <AlertCircle size={12} aria-hidden="true" />{errors.checkOutDate}
                </p>
              )}
            </div>
          </div>

          {/* Price */}
          <div className={styles.field}>
            <label className={styles.labelWithIcon}>
              <Wallet size={14} aria-hidden="true" />
              Price
            </label>
            <div className={styles.priceRow}>
              <span className={styles.priceCurrency} aria-hidden="true">{currSym}</span>
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
            <label htmlFor="res-notes" className={styles.labelWithIcon}>
              <FileText size={14} aria-hidden="true" />
              Notes
            </label>
            <textarea
              id="res-notes"
              rows={3}
              placeholder="e.g. Free cancellation until 48h before, breakfast included…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={styles.textarea}
            />
          </div>

        </div>

        {/* Footer */}
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
              <><Check size={15} aria-hidden="true" />{isEditMode ? "Save Changes" : "Save Residence"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
