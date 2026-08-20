"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Plane,
  ChevronLeft,
  ArrowRight,
  AlertCircle,
  Plus,
  Map,
  X,
} from "lucide-react";
import {
  AttractionPickerModal,
  renderTypeIcon,
  CoverImageField,
  isValidCoverUrl,
  TripSharingPanel,
  TripDetailsForm,
} from "@/components";
import type { AttractionFormData } from "@/components";
import { useAttractionTypes } from "@/hooks";
import { useAuth } from "@/contexts/AuthContext";
import { createTrip, ApiError } from "@/services";
import { NOTES_MAX, getDurationDays, getDateError, getNotesCountLevel } from "@/lib";
import type { Trip, TripCollaborator } from "@/types/trip";
import styles from "./NewTripClient.module.css";


export function NewTripClient() {
  const { token } = useAuth();
  const router = useRouter();
  const { findType } = useAttractionTypes();

  const [tripName, setTripName] = useState("");
  const [country, setCountry] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("ILS");
  const [moods, setMoods] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [attractions, setAttractions] = useState<AttractionFormData[]>([]);
  const [attractionPickerOpen, setAttractionPickerOpen] = useState(false);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [collaborators, setCollaborators] = useState<TripCollaborator[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const dateError = getDateError(startDate, endDate);
  const durationDays = getDurationDays(startDate, endDate);
  const notesLevel = getNotesCountLevel(notes.length, NOTES_MAX);

  const coverPhotoUrlValid = isValidCoverUrl(coverPhotoUrl);

  const isValid =
    tripName.trim() !== "" &&
    country !== "" &&
    startDate !== "" &&
    endDate !== "" &&
    dateError === null &&
    moods.length > 0 &&
    coverPhotoUrlValid;

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

  function handleSharingDraftUpdate(updated: Trip) {
    setIsPrivate(updated.isPrivate);
    setCollaborators(updated.collaborators);
  }

  async function handleContinue() {
    setTouched({ tripName: true, country: true, startDate: true, endDate: true, moods: true, coverPhotoUrl: true });
    if (!isValid) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const data = (await createTrip(token, {
        name: tripName,
        country,
        startDate,
        endDate,
        budget: budget ? Number(budget) : undefined,
        currency,
        moods,
        notes: notes || undefined,
        coverImage: coverPhotoUrl || undefined,
        isPrivate,
        collaboratorEmails: collaborators.map((c) => c.email),
      })) as { _id: string };

      router.push(`/trips/${data._id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError((err.body as { error?: string } | null)?.error ?? "Failed to create trip. Please try again.");
      } else {
        setSubmitError("Network error. Please check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

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

              <TripDetailsForm
                idPrefix="trip"
                tripName={tripName}
                onTripNameChange={setTripName}
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

              {/* Cover photo URL */}
              <CoverImageField
                id="trip-cover-photo"
                label="Cover photo URL"
                placeholder="https://example.com/photo.jpg"
                value={coverPhotoUrl}
                onChange={setCoverPhotoUrl}
                onBlur={() => handleBlur("coverPhotoUrl")}
                error={touched.coverPhotoUrl && !coverPhotoUrlValid ? "Please enter a valid URL" : undefined}
              />

              {/* Sharing & Privacy (draft — applied when the trip is created) */}
              {token && (
                <div className={styles.sharingSection}>
                  <TripSharingPanel
                    mode="draft"
                    token={token}
                    trip={{
                      _id: "",
                      name: tripName,
                      country,
                      startDate,
                      endDate,
                      moods,
                      collaborators,
                      isPrivate,
                    }}
                    onTripUpdate={handleSharingDraftUpdate}
                  />
                </div>
              )}

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
                      const icon = firstType ? renderTypeIcon(findType(firstType)?.icon ?? "Globe") : null;
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
