"use client";

import type { ChangeEvent } from "react";
import { PenLine, Globe, Calendar, Clock, DollarSign, Sparkles, FileText, AlertCircle, ChevronDown } from "lucide-react";
import { MoodTagButton, COUNTRIES, CurrencySelect } from "@/components";
import { useMoodTags } from "@/hooks";
import { NOTES_MAX } from "@/lib";
import type { TripDetailsFormProps } from "./TripDetailsForm.types";
import styles from "./TripDetailsForm.module.css";

/** The core trip-details fields (name, destination, dates, budget, mood, notes) shared
 *  verbatim between the new-trip and edit-trip pages. Cover-image and sharing/privacy
 *  stay with each caller — their validation/behavior genuinely diverges between the two
 *  flows (see qc-page-decomposition-followup task notes), so they weren't folded in here. */
export function TripDetailsForm({
  idPrefix,
  tripName,
  onTripNameChange,
  tripNameRef,
  country,
  onCountryChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  dateError,
  durationDays,
  budget,
  onBudgetChange,
  currency,
  onCurrencyChange,
  moods,
  onMoodToggle,
  notes,
  onNotesChange,
  notesLevel,
  touched,
  onBlur,
}: TripDetailsFormProps) {
  const { tags: moodTags } = useMoodTags();
  const showMoodError = touched.moods && moods.length === 0;

  return (
    <>
      {/* Trip name */}
      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-name`} className={styles.label}>
          <PenLine size={14} aria-hidden="true" />
          Trip name
          <span className={styles.required} aria-hidden="true"> *</span>
        </label>
        <input
          id={`${idPrefix}-name`}
          ref={tripNameRef}
          type="text"
          placeholder="e.g. Paris Summer Adventure"
          value={tripName}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onTripNameChange(e.target.value)}
          onBlur={() => onBlur("tripName")}
          className={`${styles.input} ${touched.tripName && !tripName.trim() ? styles.inputError : ""}`}
          aria-required="true"
          aria-invalid={touched.tripName && !tripName.trim()}
          aria-describedby={touched.tripName && !tripName.trim() ? `${idPrefix}-error-name` : undefined}
        />
        {touched.tripName && !tripName.trim() && (
          <p id={`${idPrefix}-error-name`} className={styles.errorMsg} role="alert">
            <AlertCircle size={12} aria-hidden="true" />
            Trip name is required
          </p>
        )}
      </div>

      {/* Destination */}
      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-country`} className={styles.label}>
          <Globe size={14} aria-hidden="true" />
          Destination
          <span className={styles.required} aria-hidden="true"> *</span>
        </label>
        <div className={styles.selectWrapper}>
          <select
            id={`${idPrefix}-country`}
            value={country}
            onChange={(e) => onCountryChange(e.target.value)}
            onBlur={() => onBlur("country")}
            className={`${styles.select} ${touched.country && !country ? styles.inputError : ""}`}
            aria-required="true"
            aria-describedby={touched.country && !country ? `${idPrefix}-error-country` : undefined}
          >
            <option value="">Select a country…</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown size={16} className={styles.selectIcon} aria-hidden="true" />
        </div>
        {touched.country && !country && (
          <p id={`${idPrefix}-error-country`} className={styles.errorMsg} role="alert">
            <AlertCircle size={12} aria-hidden="true" />
            Destination is required
          </p>
        )}
      </div>

      {/* Dates */}
      <div className={styles.field}>
        <span id={`${idPrefix}-dates-label`} className={styles.label}>
          <Calendar size={14} aria-hidden="true" />
          Dates
          <span className={styles.required} aria-hidden="true"> *</span>
        </span>
        <div className={styles.dateRow}>
          <div>
            <span className={styles.dateSubLabel}>Start</span>
            <input
              id={`${idPrefix}-start-date`}
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              onBlur={() => onBlur("startDate")}
              className={`${styles.input} ${touched.startDate && !startDate ? styles.inputError : ""}`}
              aria-label="Start date"
              aria-required="true"
            />
          </div>
          <div>
            <span className={styles.dateSubLabel}>End</span>
            <input
              id={`${idPrefix}-end-date`}
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              onBlur={() => onBlur("endDate")}
              className={`${styles.input} ${(touched.endDate && !endDate) || (touched.endDate && dateError) ? styles.inputError : ""}`}
              aria-label="End date"
              aria-required="true"
            />
          </div>
        </div>
        {(touched.endDate || touched.startDate) && dateError && (
          <p className={styles.errorMsg} role="alert">
            <AlertCircle size={12} aria-hidden="true" />
            {dateError}
          </p>
        )}
        <div aria-live="polite">
          {durationDays !== null && (
            <span className={styles.durationPill}>
              <Clock size={13} aria-hidden="true" />
              {durationDays} {durationDays === 1 ? "day" : "days"}
            </span>
          )}
        </div>
      </div>

      {/* Budget */}
      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-budget`} className={styles.label}>
          <DollarSign size={14} aria-hidden="true" />
          Budget
        </label>
        <div className={styles.currencyRow}>
          <CurrencySelect value={currency} onChange={onCurrencyChange} />
          <input
            id={`${idPrefix}-budget`}
            type="number"
            min="0"
            step="1"
            placeholder="0"
            value={budget}
            onChange={(e) => onBudgetChange(e.target.value)}
            className={styles.currencyInput}
            aria-label="Total budget amount"
          />
        </div>
      </div>

      {/* Travel mood */}
      <div className={styles.field}>
        <span id={`${idPrefix}-mood-label`} className={styles.label}>
          <Sparkles size={14} aria-hidden="true" />
          Travel mood
          <span className={styles.required} aria-hidden="true"> *</span>
        </span>
        <p className={styles.fieldHint}>Select at least one</p>
        <div
          className={styles.moodGroup}
          role="group"
          aria-labelledby={`${idPrefix}-mood-label`}
          aria-describedby={showMoodError ? `${idPrefix}-error-moods` : undefined}
        >
          {moodTags.map((t) => (
            <MoodTagButton
              key={t.name}
              tag={t.name}
              selected={moods.includes(t.name)}
              onToggle={onMoodToggle}
            />
          ))}
        </div>
        {showMoodError && (
          <p id={`${idPrefix}-error-moods`} className={styles.errorMsg} role="alert">
            <AlertCircle size={12} aria-hidden="true" />
            Select at least one travel mood
          </p>
        )}
      </div>

      {/* Notes */}
      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-notes`} className={styles.label}>
          <FileText size={14} aria-hidden="true" />
          Notes
        </label>
        <textarea
          id={`${idPrefix}-notes`}
          rows={4}
          maxLength={NOTES_MAX}
          placeholder="Anything special about this trip…"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className={styles.textarea}
        />
        <p
          className={`${styles.charCount} ${notesLevel === "error" ? styles.charCountError : notesLevel === "warn" ? styles.charCountWarning : ""}`}
          aria-live="polite"
          aria-atomic="true"
        >
          {notes.length} / {NOTES_MAX}
        </p>
      </div>
    </>
  );
}
