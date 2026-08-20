"use client";

import { useState, useEffect, useRef } from "react";
import {
  X, BedDouble, Tag, Globe, Building, Calendar, Wallet,
  FileText, ChevronDown, AlertCircle, Loader2, Check,
} from "lucide-react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { ModalShell } from "@/components/Modal";
import { toDateValue } from "@/lib";
import { MapPicker } from "@/components/NewAttractionModal";
import type { Coordinates } from "@/components/NewAttractionModal";
import type { AddResidenceModalProps, ResidenceFormData, ResidenceType } from "./AddResidenceModal.types";
import { isValidUrl } from "@/lib";
import { useReverseGeocodeAutofill } from "@/hooks";
import { RESIDENCE_TYPES } from "./AddResidenceModal.constants";
import styles from "./AddResidenceModal.module.css";

const HEADING_ID = "add-residence-modal-title";

interface FieldErrors {
  name?: string;
  residenceType?: string;
  checkInDate?: string;
  checkOutDate?: string;
  websiteUrl?: string;
}

export function AddResidenceModal({
  isOpen, onClose, onSave,
  tripCountry, tripCity, tripStartDate, tripEndDate, currency,
  initialData,
  prefill,
}: AddResidenceModalProps) {
  const isEditMode = !!initialData;
  // Ignored once initialData (edit mode) is set — editing an already-linked residence takes priority.
  const activePrefill = !initialData ? prefill : undefined;
  const [name, setName]                   = useState("");
  const [city, setCity]                   = useState(tripCity ?? "");
  const [residenceType, setResidenceType] = useState<ResidenceType>("Hotel");
  const [checkInDate, setCheckInDate]     = useState("");
  const [checkOutDate, setCheckOutDate]   = useState("");
  const [price, setPrice]                 = useState<number | null>(null);
  const [priceCurrency, setPriceCurrency] = useState(currency ?? "USD");
  const [coordinates, setCoordinates]     = useState<Coordinates | null>(null);

  const handleCoordinatesChange = useReverseGeocodeAutofill({
    name,
    city,
    onCoordinates: setCoordinates,
    onNameResolved: setName,
    onCityResolved: setCity,
  });
  const [notes, setNotes]                 = useState("");
  const [websiteUrl, setWebsiteUrl]       = useState("");
  const [errors, setErrors]               = useState<FieldErrors>({});
  const [touched, setTouched]             = useState<Record<string, boolean>>({});
  const [saving, setSaving]               = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isOpen) return;
    // Place fields: edit mode > picked-existing prefill > blank. Stay dates/price/notes are
    // intentionally left blank for a prefill (this trip's own stay, not the picked document's).
    setName(initialData?.name ?? activePrefill?.name ?? "");
    setCity(initialData?.city ?? activePrefill?.city ?? tripCity ?? "");
    setResidenceType(initialData?.residenceType ?? activePrefill?.residenceType ?? "Hotel");
    setCheckInDate(initialData?.checkInDate ?? "");
    setCheckOutDate(initialData?.checkOutDate ?? "");
    setCoordinates(initialData?.coordinates ?? activePrefill?.coordinates ?? null);
    setPrice(initialData?.price ?? null);
    setPriceCurrency(initialData?.currency ?? currency ?? "USD");
    setNotes(initialData?.notes ?? "");
    setWebsiteUrl(initialData?.websiteUrl ?? "");
    setErrors({});
    setTouched({});
  }, [isOpen]); // intentionally omits initialData/prefill/tripCity — only sync when modal opens

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
    if (!isValidUrl(websiteUrl)) errs.websiteUrl = "Enter a valid URL (e.g. https://example.com)";
    return errs;
  }

  function handleBlur(field: keyof FieldErrors) {
    setTouched((p) => ({ ...p, [field]: true }));
    setErrors(validate());
  }

  async function handleSave() {
    setTouched({ name: true, residenceType: true, checkInDate: true, checkOutDate: true, websiteUrl: true });
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
      currency: priceCurrency,
      notes,
      types: residenceType !== "Other" ? [residenceType] : [],
      subtype: "residence",
      websiteUrl: websiteUrl.trim(),
      existingAttractionId: activePrefill?.existingAttractionId,
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
          <BedDouble size={18} aria-hidden="true" className={styles.titleIcon} />
          {isEditMode ? "Edit Residence" : "Add Residence"}
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
              <><Check size={15} aria-hidden="true" />{isEditMode ? "Save Changes" : "Save Residence"}</>
            )}
          </button>
        </>
      }
    >
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
        <MapPicker coordinates={coordinates} onChange={handleCoordinatesChange} />
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

      {/* Official website */}
      <div className={styles.field}>
        <label htmlFor="res-website" className={styles.labelWithIcon}>
          <Globe size={14} aria-hidden="true" />
          Website (optional)
        </label>
        <input
          id="res-website"
          type="url"
          placeholder="https://…"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          onBlur={() => handleBlur("websiteUrl")}
          className={`${styles.input} ${touched.websiteUrl && errors.websiteUrl ? styles.inputError : ""}`}
          aria-describedby={touched.websiteUrl && errors.websiteUrl ? "res-err-website" : undefined}
        />
        {touched.websiteUrl && errors.websiteUrl && (
          <p id="res-err-website" className={styles.errorMsg} role="alert">
            <AlertCircle size={12} aria-hidden="true" />{errors.websiteUrl}
          </p>
        )}
      </div>
    </ModalShell>
  );
}
