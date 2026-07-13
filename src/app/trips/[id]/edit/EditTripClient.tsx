"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  PenLine,
  Globe,
  Calendar,
  Clock,
  DollarSign,
  Sparkles,
  FileText,
  AlertCircle,
  Check,
  Trash2,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { MoodTagButton } from "@/components/MoodTagButton/MoodTagButton";
import { MoodTagChip } from "@/components/MoodTagChip/MoodTagChip";
import { CoverImageField } from "@/components";
import { useAuth } from "@/contexts/AuthContext";
import { formatDisplayDate } from "@/lib/formatDate";
import { COUNTRIES } from "@/components/NewAttractionModal/attraction.constants";
import { useMoodTags } from "@/hooks/useMoodTags";
import { CURRENCIES, NOTES_MAX, getDurationDays, getDateError, getNotesCountLevel } from "@/lib/tripForm";
import type { Trip } from "@/types/trip";
import styles from "./EditTripClient.module.css";

function isoToDateInput(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toISOString().split("T")[0];
}

interface EditTripClientProps {
  tripId: string;
}

export function EditTripClient({ tripId }: EditTripClientProps) {
  const { token, user } = useAuth();
  const router = useRouter();
  const { tags: moodTags } = useMoodTags();
  const tripNameRef = useRef<HTMLInputElement>(null);

  // Page loading (fetching existing trip data)
  const [pageLoading, setPageLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  // Form state
  const [tripName, setTripName] = useState("");
  const [country, setCountry] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [moods, setMoods] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [coverImage, setCoverImage] = useState("");

  // Interaction state
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submitError, setSubmitError] = useState("");

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

  // Fetch existing trip on mount
  useEffect(() => {
    if (!token) return;
    fetch(`/api/trips/${tripId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 404) { router.replace("/trips"); return null; }
        return res.json() as Promise<Trip>;
      })
      .then((data) => {
        if (!data) return;
        setTripName(data.name);
        setCountry(data.country);
        setStartDate(isoToDateInput(data.startDate));
        setEndDate(isoToDateInput(data.endDate));
        setBudget(data.budget !== undefined ? String(data.budget) : "");
        setCurrency(data.currency ?? "USD");
        setMoods(data.moods ?? []);
        setNotes(data.notes ?? "");
        setCoverImage(data.coverImage ?? "");
        setIsOwner(!!user && user._id === data.ownerId);
      })
      .catch(() => router.replace("/trips"))
      .finally(() => setPageLoading(false));
  }, [token, tripId, router]);

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function handleMoodToggle(tag: string) {
    setMoods((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setTouched((prev) => ({ ...prev, moods: true }));
  }

  async function handleSave() {
    setTouched({ tripName: true, country: true, startDate: true, endDate: true, moods: true });
    if (!isValid) {
      tripNameRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
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
          coverImage: coverImage || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? "Failed to save changes");
        return;
      }

      router.push(`/trips/${tripId}`);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this trip? This cannot be undone.")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      if (res.ok) router.push("/trips");
    } catch {
      // Leave deleting=true so user knows something happened
    } finally {
      setDeleting(false);
    }
  }

  const showMoodError = touched.moods && moods.length === 0;
  const showCoverPreview = coverImage.startsWith("http");

  if (pageLoading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={32} className={styles.loadingIcon} aria-hidden="true" />
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>

        {/* Page header */}
        <div className={styles.pageHeader}>
          <Link href={`/trips/${tripId}`} className={styles.backLink}>
            <ChevronLeft size={16} aria-hidden="true" />
            Trip Details
          </Link>
          <h1 className={styles.heading}>
            <PenLine size={22} className={styles.headingIcon} aria-hidden="true" />
            Edit Trip
          </h1>
          <p className={styles.subtitle}>Update your trip details below.</p>
        </div>

        {/* Two-column grid */}
        <div className={styles.grid}>

          {/* ── Left: Form card ── */}
          <div className={styles.formCard}>
            <h2 className={styles.sectionHeading}>Trip Details</h2>

            {/* Trip name */}
            <div className={styles.field}>
              <label htmlFor="edit-trip-name" className={styles.label}>
                <PenLine size={14} aria-hidden="true" />
                Trip name
                <span className={styles.required} aria-hidden="true"> *</span>
              </label>
              <input
                id="edit-trip-name"
                ref={tripNameRef}
                type="text"
                placeholder="e.g. Paris Summer Adventure"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                onBlur={() => handleBlur("tripName")}
                className={`${styles.input} ${touched.tripName && !tripName.trim() ? styles.inputError : ""}`}
                aria-required="true"
                aria-invalid={touched.tripName && !tripName.trim()}
                aria-describedby={touched.tripName && !tripName.trim() ? "edit-error-name" : undefined}
              />
              {touched.tripName && !tripName.trim() && (
                <p id="edit-error-name" className={styles.errorMsg} role="alert">
                  <AlertCircle size={12} aria-hidden="true" />
                  Trip name is required
                </p>
              )}
            </div>

            {/* Country */}
            <div className={styles.field}>
              <label htmlFor="edit-trip-country" className={styles.label}>
                <Globe size={14} aria-hidden="true" />
                Destination
                <span className={styles.required} aria-hidden="true"> *</span>
              </label>
              <div className={styles.selectWrapper}>
                <select
                  id="edit-trip-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  onBlur={() => handleBlur("country")}
                  className={`${styles.select} ${touched.country && !country ? styles.inputError : ""}`}
                  aria-required="true"
                >
                  <option value="">Select a country…</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown size={16} className={styles.selectIcon} aria-hidden="true" />
              </div>
              {touched.country && !country && (
                <p className={styles.errorMsg} role="alert">
                  <AlertCircle size={12} aria-hidden="true" />
                  Destination is required
                </p>
              )}
            </div>

            {/* Dates */}
            <div className={styles.field}>
              <span className={styles.label}>
                <Calendar size={14} aria-hidden="true" />
                Dates
                <span className={styles.required} aria-hidden="true"> *</span>
              </span>
              <div className={styles.dateRow}>
                <div>
                  <span className={styles.dateSubLabel}>Start</span>
                  <input
                    id="edit-start-date"
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
                    id="edit-end-date"
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
              <label htmlFor="edit-trip-budget" className={styles.label}>
                <DollarSign size={14} aria-hidden="true" />
                Budget
              </label>
              <div className={styles.currencyRow}>
                <div className={styles.currencySelectWrapper}>
                  <select
                    id="edit-trip-currency"
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
                  id="edit-trip-budget"
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
              <span id="edit-mood-label" className={styles.label}>
                <Sparkles size={14} aria-hidden="true" />
                Travel mood
                <span className={styles.required} aria-hidden="true"> *</span>
              </span>
              <p className={styles.fieldHint}>Select at least one</p>
              <div
                className={styles.moodGroup}
                role="group"
                aria-labelledby="edit-mood-label"
                aria-describedby={showMoodError ? "edit-error-moods" : undefined}
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
                <p id="edit-error-moods" className={styles.errorMsg} role="alert">
                  <AlertCircle size={12} aria-hidden="true" />
                  Select at least one travel mood
                </p>
              )}
            </div>

            {/* Notes */}
            <div className={styles.field}>
              <label htmlFor="edit-trip-notes" className={styles.label}>
                <FileText size={14} aria-hidden="true" />
                Notes
              </label>
              <textarea
                id="edit-trip-notes"
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

            {/* Cover image URL */}
            <CoverImageField
              id="edit-cover-image"
              label="Cover image"
              value={coverImage}
              onChange={setCoverImage}
            />

            {/* Submit error */}
            {submitError && (
              <p className={styles.errorMsg} role="alert">
                <AlertCircle size={12} aria-hidden="true" />
                {submitError}
              </p>
            )}

            {/* CTA row */}
            <div className={styles.ctaRow}>
              <Link href={`/trips/${tripId}`} className={styles.cancelBtn}>
                Cancel
              </Link>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={!isValid || submitting}
                aria-disabled={!isValid || submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className={styles.spinnerIcon} aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check size={15} aria-hidden="true" />
                    Save Changes
                  </>
                )}
              </button>
            </div>

            {/* Danger zone — owner only */}
            {isOwner && (
              <div className={styles.dangerZone}>
                <p className={styles.dangerLabel}>Danger Zone</p>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={handleDelete}
                  disabled={deleting}
                  aria-label="Delete this trip permanently"
                >
                  {deleting ? (
                    <>
                      <Loader2 size={15} className={styles.spinnerIcon} aria-hidden="true" />
                      Deleting…
                    </>
                  ) : (
                    <>
                      <Trash2 size={15} aria-hidden="true" />
                      Delete trip
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ── Right: Live preview card ── */}
          <div className={styles.previewCard}>
            <h2 className={styles.sectionHeading}>Preview</h2>

            <div className={styles.previewThumbnail}>
              {showCoverPreview ? (
                <Image
                  src={coverImage}
                  fill
                  className={styles.previewThumbImg}
                  alt="Cover preview"
                  sizes="380px"
                  unoptimized
                />
              ) : (
                <div className={styles.previewThumbnailPlaceholder} aria-hidden="true" />
              )}
            </div>

            <div className={styles.previewBody}>
              <p className={tripName ? styles.previewName : styles.previewNamePlaceholder}>
                {tripName || "Trip name"}
              </p>
              {country && <p className={styles.previewCountry}>{country}</p>}
              {startDate && endDate && !dateError && (
                <div className={styles.previewDates}>
                  <Calendar size={13} aria-hidden="true" />
                  <span>
                    {formatDisplayDate(startDate)} – {formatDisplayDate(endDate)}
                  </span>
                </div>
              )}
              {moods.length > 0 && (
                <div className={styles.previewMoods}>
                  {moods.slice(0, 3).map((tag) => (
                    <MoodTagChip key={tag} tag={tag} />
                  ))}
                </div>
              )}
            </div>

            <p className={styles.previewNote}>Live preview of your trip card.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
