"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Plane,
  ChevronLeft,
  PenLine,
  Globe,
  Calendar,
  Clock,
  DollarSign,
  Sparkles,
  FileText,
  ArrowRight,
  AlertCircle,
  Plus,
  Map,
  X,
  ChevronDown,
} from "lucide-react";
import { AttractionPickerModal } from "@/components/AttractionPickerModal/AttractionPickerModal";
import { MoodTagButton } from "@/components/MoodTagButton/MoodTagButton";
import { ICONS } from "@/components/NewAttractionModal/AttractionTypeChip";
import type { AttractionFormData } from "@/components/NewAttractionModal/attraction.types";
import { COUNTRIES } from "@/components/NewAttractionModal/attraction.constants";
import { useAuth } from "@/contexts/AuthContext";
import { useMoodTags } from "@/hooks/useMoodTags";
import { CURRENCIES, NOTES_MAX, getDurationDays, getDateError, getNotesCountLevel } from "@/lib/tripForm";
import styles from "./NewTripClient.module.css";


export function NewTripClient() {
  const { token } = useAuth();
  const router = useRouter();
  const { tags: moodTags } = useMoodTags();

  const [tripName, setTripName] = useState("");
  const [country, setCountry] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [moods, setMoods] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [attractions, setAttractions] = useState<AttractionFormData[]>([]);
  const [attractionPickerOpen, setAttractionPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const dateError = getDateError(startDate, endDate);
  const durationDays = getDurationDays(startDate, endDate);
  const notesLevel = getNotesCountLevel(notes.length, NOTES_MAX);

  const isValid =
    tripName.trim() !== "" &&
    country !== "" &&
    startDate !== "" &&
    endDate !== "" &&
    dateError === null &&
    moods.length > 0;

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function handleMoodToggle(tag: string) {
    setMoods((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setTouched((prev) => ({ ...prev, moods: true }));
  }

  function handleAttractionsAdd(selected: AttractionFormData[]) {
    setAttractions((prev) => [...prev, ...selected]);
  }

  function handleRemoveAttraction(index: number) {
    setAttractions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleContinue() {
    setTouched({ tripName: true, country: true, startDate: true, endDate: true, moods: true });
    if (!isValid) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: tripName,
          country,
          startDate,
          endDate,
          budget: budget ? Number(budget) : undefined,
          currency,
          moods,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? "Failed to create trip. Please try again.");
        return;
      }

      router.push(`/trips/${data._id as string}`);
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const showMoodError = touched.moods && moods.length === 0;

  return (
    <>
      <main className={styles.page}>
        <div className={styles.container}>

          {/* Page header */}
          <div className={styles.pageHeader}>
            <Link href="/" className={styles.backLink}>
              <ChevronLeft size={16} aria-hidden="true" />
              Dashboard
            </Link>
            <h1 className={styles.heading}>
              <Plane size={22} className={styles.headingIcon} aria-hidden="true" />
              Plan Your Trip
            </h1>
            <p className={styles.subtitle}>
              Fill in the details, then add the places you want to visit.
            </p>
          </div>

          {/* Two-column grid */}
          <div className={styles.grid}>

            {/* ── Left: Form card ── */}
            <div className={styles.formCard}>
              <h2 className={styles.sectionHeading}>Trip Details</h2>

              {/* Trip name */}
              <div className={styles.field}>
                <label htmlFor="trip-name" className={styles.label}>
                  <PenLine size={14} aria-hidden="true" />
                  Trip name
                  <span className={styles.required} aria-hidden="true"> *</span>
                </label>
                <input
                  id="trip-name"
                  type="text"
                  placeholder="e.g. Paris Summer Adventure"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  onBlur={() => handleBlur("tripName")}
                  className={`${styles.input} ${touched.tripName && !tripName.trim() ? styles.inputError : ""}`}
                  aria-required="true"
                  aria-describedby={touched.tripName && !tripName.trim() ? "error-name" : undefined}
                />
                {touched.tripName && !tripName.trim() && (
                  <p id="error-name" className={styles.errorMsg} role="alert">
                    <AlertCircle size={12} aria-hidden="true" />
                    Trip name is required
                  </p>
                )}
              </div>

              {/* Destination */}
              <div className={styles.field}>
                <label htmlFor="trip-country" className={styles.label}>
                  <Globe size={14} aria-hidden="true" />
                  Destination
                  <span className={styles.required} aria-hidden="true"> *</span>
                </label>
                <div className={styles.selectWrapper}>
                  <select
                    id="trip-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    onBlur={() => handleBlur("country")}
                    className={`${styles.select} ${touched.country && !country ? styles.inputError : ""}`}
                    aria-required="true"
                    aria-describedby={touched.country && !country ? "error-country" : undefined}
                  >
                    <option value="">Select a country…</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className={styles.selectIcon} aria-hidden="true" />
                </div>
                {touched.country && !country && (
                  <p id="error-country" className={styles.errorMsg} role="alert">
                    <AlertCircle size={12} aria-hidden="true" />
                    Destination is required
                  </p>
                )}
              </div>

              {/* Dates */}
              <div className={styles.field}>
                <span id="dates-label" className={styles.label}>
                  <Calendar size={14} aria-hidden="true" />
                  Dates
                  <span className={styles.required} aria-hidden="true"> *</span>
                </span>
                <div className={styles.dateRow}>
                  <div>
                    <span className={styles.dateSubLabel}>Start</span>
                    <input
                      id="trip-start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      onBlur={() => handleBlur("startDate")}
                      className={`${styles.input} ${touched.startDate && !startDate ? styles.inputError : ""}`}
                      aria-label="Start date"
                      aria-required="true"
                    />
                  </div>
                  <div>
                    <span className={styles.dateSubLabel}>End</span>
                    <input
                      id="trip-end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      onBlur={() => handleBlur("endDate")}
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
                <label htmlFor="trip-budget" className={styles.label}>
                  <DollarSign size={14} aria-hidden="true" />
                  Budget
                </label>
                <div className={styles.currencyRow}>
                  <div className={styles.currencySelectWrapper}>
                    <select
                      id="trip-currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className={styles.currencySelect}
                      aria-label="Currency"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.symbol} {c.code}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className={styles.currencySelectIcon} aria-hidden="true" />
                  </div>
                  <input
                    id="trip-budget"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className={styles.currencyInput}
                    aria-label="Total budget amount"
                  />
                </div>
              </div>

              {/* Travel mood */}
              <div className={styles.field}>
                <span id="mood-label" className={styles.label}>
                  <Sparkles size={14} aria-hidden="true" />
                  Travel mood
                  <span className={styles.required} aria-hidden="true"> *</span>
                </span>
                <p className={styles.fieldHint}>Select at least one</p>
                <div
                  className={styles.moodGroup}
                  role="group"
                  aria-labelledby="mood-label"
                  aria-describedby={showMoodError ? "error-moods" : undefined}
                >
                  {moodTags.map((t) => (
                    <MoodTagButton
                      key={t.name}
                      tag={t.name}
                      selected={moods.includes(t.name)}
                      onToggle={handleMoodToggle}
                    />
                  ))}
                </div>
                {showMoodError && (
                  <p id="error-moods" className={styles.errorMsg} role="alert">
                    <AlertCircle size={12} aria-hidden="true" />
                    Select at least one travel mood
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className={styles.field}>
                <label htmlFor="trip-notes" className={styles.label}>
                  <FileText size={14} aria-hidden="true" />
                  Notes
                </label>
                <textarea
                  id="trip-notes"
                  rows={4}
                  maxLength={NOTES_MAX}
                  placeholder="Anything special about this trip…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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

              {/* Submit error */}
              {submitError && (
                <p className={styles.errorMsg} role="alert">
                  <AlertCircle size={12} aria-hidden="true" />
                  {submitError}
                </p>
              )}

              {/* CTA */}
              <div className={styles.ctaRow}>
                <button
                  type="button"
                  className={styles.ctaBtn}
                  onClick={handleContinue}
                  disabled={!isValid || submitting}
                  aria-disabled={!isValid || submitting}
                >
                  {submitting ? "Creating trip…" : "Create Trip"}
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* ── Right: Attractions panel ── */}
            <div className={styles.attractionsCard}>
              <div className={styles.attractionsHeader}>
                <h2 className={styles.sectionHeading}>Your Attractions</h2>
                {attractions.length > 0 && (
                  <span className={styles.countBadge} aria-label={`${attractions.length} attraction${attractions.length !== 1 ? "s" : ""} added`}>
                    {attractions.length}
                  </span>
                )}
              </div>

              {attractions.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIconCircle} aria-hidden="true">
                    <Map size={32} className={styles.emptyIcon} />
                  </div>
                  <p className={styles.emptyHeading}>No attractions yet</p>
                  <p className={styles.emptyBody}>
                    Add the places you want to visit to start building your itinerary.
                  </p>
                  <button
                    type="button"
                    className={styles.addAttractionBtn}
                    onClick={() => setAttractionPickerOpen(true)}
                  >
                    <Plus size={15} aria-hidden="true" />
                    Add Attraction
                  </button>
                </div>
              ) : (
                <>
                  <ul className={styles.attractionList}>
                    {attractions.map((a, i) => {
                      const firstType = a.types[0];
                      const icon = firstType ? ICONS[firstType] : null;
                      return (
                        <li key={i} className={styles.attractionItem}>
                          <div className={styles.attractionIconCircle} aria-hidden="true">
                            {icon}
                          </div>
                          <div className={styles.attractionInfo}>
                            <span className={styles.attractionName}>{a.name}</span>
                            <span className={styles.attractionMeta}>
                              {a.types.join(", ")}
                              {a.country ? ` · ${a.country}` : ""}
                            </span>
                          </div>
                          <button
                            type="button"
                            className={styles.removeBtn}
                            onClick={() => handleRemoveAttraction(i)}
                            aria-label={`Remove ${a.name}`}
                          >
                            <X size={14} aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <button
                    type="button"
                    className={styles.addMoreBtn}
                    onClick={() => setAttractionPickerOpen(true)}
                  >
                    <Plus size={15} aria-hidden="true" />
                    Add Another Attraction
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <AttractionPickerModal
        isOpen={attractionPickerOpen}
        onClose={() => setAttractionPickerOpen(false)}
        onAdd={handleAttractionsAdd}
        alreadyAdded={attractions}
      />
    </>
  );
}
