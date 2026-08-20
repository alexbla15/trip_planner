"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  PenLine,
  Calendar,
  AlertCircle,
  Check,
  Trash2,
  Loader2,
} from "lucide-react";
import { MoodTagChip, CoverImageField, TripSharingPanel, TripDetailsForm } from "@/components";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getTrip, updateTrip, deleteTrip, type TripErrorResponse } from "@/services";
import {
  formatDisplayDate,
  NOTES_MAX,
  getDurationDays,
  getDateError,
  getNotesCountLevel,
  toDateValue,
} from "@/lib";
import type { Trip } from "@/types/trip";
import styles from "./EditTripClient.module.css";

interface EditTripClientProps {
  tripId: string;
}

export function EditTripClient({ tripId }: EditTripClientProps) {
  const { token, user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const tripNameRef = useRef<HTMLInputElement>(null);

  // Page loading (fetching existing trip data)
  const [pageLoading, setPageLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [trip, setTrip] = useState<Trip | null>(null);

  // Form state
  const [tripName, setTripName] = useState("");
  const [country, setCountry] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("ILS");
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
    getTrip(tripId, token)
      .then((res) => {
        if (res.status === 404) { router.replace("/trips"); return null; }
        return res.json() as Promise<Trip>;
      })
      .then((data) => {
        if (!data) return;
        setTrip(data);
        setTripName(data.name);
        setCountry(data.country);
        setStartDate(toDateValue(data.startDate));
        setEndDate(toDateValue(data.endDate));
        setBudget(data.budget !== undefined ? String(data.budget) : "");
        setCurrency(data.currency ?? "ILS");
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
      const res = await updateTrip(tripId, token ?? "", {
        name: tripName,
        country,
        startDate,
        endDate,
        budget: budget ? Number(budget) : undefined,
        currency,
        moods,
        notes: notes || undefined,
        coverImage: coverImage || undefined,
        isPrivate: trip?.isPrivate,
        collaboratorEmails: (trip?.collaborators ?? []).map((c) => c.email),
      });

      const data = await res.json() as TripErrorResponse;

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
      await deleteTrip(tripId, token ?? "");
      router.push("/trips");
    } catch {
      toast.error("Failed to delete trip. Please try again.");
      setDeleting(false);
    }
  }

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

            <TripDetailsForm
              idPrefix="edit-trip"
              tripName={tripName}
              onTripNameChange={setTripName}
              tripNameRef={tripNameRef}
              country={country}
              onCountryChange={setCountry}
              startDate={startDate}
              onStartDateChange={setStartDate}
              endDate={endDate}
              onEndDateChange={setEndDate}
              dateError={dateError}
              durationDays={durationDays}
              budget={budget}
              onBudgetChange={setBudget}
              currency={currency}
              onCurrencyChange={setCurrency}
              moods={moods}
              onMoodToggle={handleMoodToggle}
              notes={notes}
              onNotesChange={setNotes}
              notesLevel={notesLevel}
              touched={touched}
              onBlur={handleBlur}
            />

            {/* Cover image URL */}
            <CoverImageField
              id="edit-cover-image"
              label="Cover image"
              value={coverImage}
              onChange={setCoverImage}
            />

            {/* Sharing & Privacy — owner only */}
            {isOwner && token && trip && (
              <div className={styles.sharingSection}>
                <TripSharingPanel trip={trip} token={token} onTripUpdate={setTrip} mode="draft" />
              </div>
            )}

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
