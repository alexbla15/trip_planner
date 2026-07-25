"use client";

import { useState, useEffect, useRef } from "react";
import {
  X, Plane, Tag, Calendar, MapPin, Clock, Wallet,
  FileText, AlertCircle, Loader2, Check,
} from "lucide-react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { ModalShell } from "@/components/Modal";
import { toDateValue, buildISODateTime, addOneDay } from "@/lib";
import type { AddFlightModalProps, FlightFormData } from "./AddFlightModal.types";
import styles from "./AddFlightModal.module.css";

const HEADING_ID = "add-flight-modal-title";

interface FieldErrors {
  flightDate?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureTime?: string;
  arrivalTime?: string;
}

export function AddFlightModal({
  isOpen, onClose, onSave,
  tripCountry, tripCity, tripStartDate, tripEndDate, currency,
  initialData,
}: AddFlightModalProps) {
  const isEditMode = !!initialData;
  const [airline, setAirline]                 = useState("");
  const [flightNumber, setFlightNumber]       = useState("");
  const [flightDate, setFlightDate]           = useState("");
  const [departureAirport, setDepartureAirport] = useState("");
  const [departureTime, setDepartureTime]     = useState("");
  const [arrivalAirport, setArrivalAirport]   = useState("");
  const [arrivalTime, setArrivalTime]         = useState("");
  const [price, setPrice]                     = useState<number | null>(null);
  const [priceCurrency, setPriceCurrency]     = useState(currency ?? "USD");
  const [notes, setNotes]                     = useState("");
  const [errors, setErrors]                   = useState<FieldErrors>({});
  const [touched, setTouched]                 = useState<Record<string, boolean>>({});
  const [saving, setSaving]                   = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isOpen) return;
    setAirline(initialData?.airline ?? "");
    setFlightNumber(initialData?.flightNumber ?? "");
    setFlightDate(initialData?.flightDate ?? "");
    setDepartureAirport(initialData?.departureAirport ?? "");
    setDepartureTime(initialData?.departureTimeHHMM ?? "");
    setArrivalAirport(initialData?.arrivalAirport ?? "");
    setArrivalTime(initialData?.arrivalTimeHHMM ?? "");
    setPrice(initialData?.price ?? null);
    setPriceCurrency(initialData?.currency ?? currency ?? "USD");
    setNotes(initialData?.notes ?? "");
    setErrors({}); setTouched({});
  }, [isOpen]); // intentionally omits initialData — only sync when modal opens, not on every re-render

  const tripStart = toDateValue(tripStartDate);
  const tripEnd   = toDateValue(tripEndDate);

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!flightDate)         errs.flightDate       = "Date is required";
    if (!departureAirport.trim()) errs.departureAirport = "Departure airport is required";
    if (!arrivalAirport.trim())   errs.arrivalAirport   = "Arrival airport is required";
    if (!departureTime)      errs.departureTime    = "Departure time is required";
    if (!arrivalTime)        errs.arrivalTime      = "Arrival time is required";
    return errs;
  }

  function handleBlur(field: keyof FieldErrors) {
    setTouched((p) => ({ ...p, [field]: true }));
    setErrors(validate());
  }

  async function handleSave() {
    setTouched({ flightDate: true, departureAirport: true, arrivalAirport: true, departureTime: true, arrivalTime: true });
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Build ISO datetimes; if arrivalTime < departureTime, arrival is next day
    const depIso = buildISODateTime(flightDate, departureTime);
    const arrivalDate = arrivalTime < departureTime ? addOneDay(flightDate) : flightDate;
    const arrIso = buildISODateTime(arrivalDate, arrivalTime);

    // Compute flight duration from dep → arr
    const durationMins = Math.round((new Date(arrIso).getTime() - new Date(depIso).getTime()) / 60000);
    const durationStr  = String(Math.max(1, durationMins));

    // Derive name: "Airline FlightNumber" or "DEP → ARR"
    const nameParts = [airline.trim(), flightNumber.trim()].filter(Boolean);
    const derivedName = nameParts.length > 0
      ? nameParts.join(" ")
      : `${departureAirport.trim().toUpperCase()} → ${arrivalAirport.trim().toUpperCase()}`;

    setSaving(true);
    const data: FlightFormData = {
      name: derivedName,
      country: tripCountry,
      city: tripCity?.trim() || tripCountry,
      types: ["Flight"],
      subtype: "flight",
      flightNumber: flightNumber.trim(),
      airline: airline.trim(),
      departureAirport: departureAirport.trim().toUpperCase(),
      arrivalAirport: arrivalAirport.trim().toUpperCase(),
      departureTime: depIso,
      arrivalTime: arrIso,
      price,
      currency: priceCurrency,
      notes,
      plannedDate: flightDate,
      plannedTime: departureTime,
      durationValue: durationStr,
      durationUnit: "minutes",
      actualDurationValue: durationStr,
      actualDurationUnit: "minutes",
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
          <Plane size={18} aria-hidden="true" className={styles.titleIcon} />
          {isEditMode ? "Edit Flight" : "Add Flight"}
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
              <><Check size={15} aria-hidden="true" />{isEditMode ? "Save Changes" : "Save Flight"}</>
            )}
          </button>
        </>
      }
    >
      {/* Airline + Flight number */}
      <div className={styles.twoCol}>
        <div className={styles.field}>
          <label htmlFor="fl-airline" className={styles.labelWithIcon}>
            <Tag size={14} aria-hidden="true" />
            Airline
          </label>
          <input
            ref={firstInputRef}
            id="fl-airline"
            type="text"
            placeholder="e.g. British Airways"
            value={airline}
            onChange={(e) => setAirline(e.target.value)}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="fl-number" className={styles.labelWithIcon}>
            <Tag size={14} aria-hidden="true" />
            Flight number
          </label>
          <input
            id="fl-number"
            type="text"
            placeholder="e.g. BA2490"
            value={flightNumber}
            onChange={(e) => setFlightNumber(e.target.value)}
            className={styles.input}
          />
        </div>
      </div>

      {/* Date */}
      <div className={styles.field}>
        <label htmlFor="fl-date" className={styles.labelWithIcon}>
          <Calendar size={14} aria-hidden="true" />
          Date <span className={styles.required} aria-hidden="true">*</span>
        </label>
        <input
          id="fl-date"
          type="date"
          value={flightDate}
          min={tripStart}
          max={tripEnd}
          onChange={(e) => setFlightDate(e.target.value)}
          onBlur={() => handleBlur("flightDate")}
          className={`${styles.input} ${touched.flightDate && errors.flightDate ? styles.inputError : ""}`}
          aria-required="true"
          aria-describedby={touched.flightDate && errors.flightDate ? "fl-err-date" : undefined}
        />
        {touched.flightDate && errors.flightDate && (
          <p id="fl-err-date" className={styles.errorMsg} role="alert">
            <AlertCircle size={12} aria-hidden="true" />{errors.flightDate}
          </p>
        )}
      </div>

      {/* Departure airport + time */}
      <div className={styles.twoCol}>
        <div className={styles.field}>
          <label htmlFor="fl-dep-airport" className={styles.labelWithIcon}>
            <MapPin size={14} aria-hidden="true" />
            From <span className={styles.required} aria-hidden="true">*</span>
          </label>
          <input
            id="fl-dep-airport"
            type="text"
            placeholder="e.g. LHR"
            value={departureAirport}
            onChange={(e) => setDepartureAirport(e.target.value)}
            onBlur={() => handleBlur("departureAirport")}
            className={`${styles.input} ${touched.departureAirport && errors.departureAirport ? styles.inputError : ""}`}
            aria-required="true"
            aria-describedby={touched.departureAirport && errors.departureAirport ? "fl-err-dep" : undefined}
          />
          {touched.departureAirport && errors.departureAirport && (
            <p id="fl-err-dep" className={styles.errorMsg} role="alert">
              <AlertCircle size={12} aria-hidden="true" />{errors.departureAirport}
            </p>
          )}
        </div>
        <div className={styles.field}>
          <label htmlFor="fl-dep-time" className={styles.labelWithIcon}>
            <Clock size={14} aria-hidden="true" />
            Dep. time <span className={styles.required} aria-hidden="true">*</span>
          </label>
          <input
            id="fl-dep-time"
            type="time"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            onBlur={() => handleBlur("departureTime")}
            className={`${styles.input} ${touched.departureTime && errors.departureTime ? styles.inputError : ""}`}
            aria-required="true"
            aria-describedby={touched.departureTime && errors.departureTime ? "fl-err-dtime" : undefined}
          />
          {touched.departureTime && errors.departureTime && (
            <p id="fl-err-dtime" className={styles.errorMsg} role="alert">
              <AlertCircle size={12} aria-hidden="true" />{errors.departureTime}
            </p>
          )}
        </div>
      </div>

      {/* Arrival airport + time */}
      <div className={styles.twoCol}>
        <div className={styles.field}>
          <label htmlFor="fl-arr-airport" className={styles.labelWithIcon}>
            <MapPin size={14} aria-hidden="true" />
            To <span className={styles.required} aria-hidden="true">*</span>
          </label>
          <input
            id="fl-arr-airport"
            type="text"
            placeholder="e.g. CDG"
            value={arrivalAirport}
            onChange={(e) => setArrivalAirport(e.target.value)}
            onBlur={() => handleBlur("arrivalAirport")}
            className={`${styles.input} ${touched.arrivalAirport && errors.arrivalAirport ? styles.inputError : ""}`}
            aria-required="true"
            aria-describedby={touched.arrivalAirport && errors.arrivalAirport ? "fl-err-arr" : undefined}
          />
          {touched.arrivalAirport && errors.arrivalAirport && (
            <p id="fl-err-arr" className={styles.errorMsg} role="alert">
              <AlertCircle size={12} aria-hidden="true" />{errors.arrivalAirport}
            </p>
          )}
        </div>
        <div className={styles.field}>
          <label htmlFor="fl-arr-time" className={styles.labelWithIcon}>
            <Clock size={14} aria-hidden="true" />
            Arr. time <span className={styles.required} aria-hidden="true">*</span>
          </label>
          <input
            id="fl-arr-time"
            type="time"
            value={arrivalTime}
            onChange={(e) => setArrivalTime(e.target.value)}
            onBlur={() => handleBlur("arrivalTime")}
            className={`${styles.input} ${touched.arrivalTime && errors.arrivalTime ? styles.inputError : ""}`}
            aria-required="true"
            aria-describedby={touched.arrivalTime && errors.arrivalTime ? "fl-err-atime" : undefined}
          />
          {touched.arrivalTime && errors.arrivalTime && (
            <p id="fl-err-atime" className={styles.errorMsg} role="alert">
              <AlertCircle size={12} aria-hidden="true" />{errors.arrivalTime}
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
        <label htmlFor="fl-notes" className={styles.labelWithIcon}>
          <FileText size={14} aria-hidden="true" />
          Notes
        </label>
        <textarea
          id="fl-notes"
          rows={3}
          placeholder="e.g. Hand luggage only, online check-in open…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={styles.textarea}
        />
      </div>
    </ModalShell>
  );
}
