"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Globe,
  DollarSign,
  MapPinned,
  Plus,
  Loader2,
  Trash2,
  PenLine,
} from "lucide-react";
import { MoodTagChip } from "@/components/MoodTagChip/MoodTagChip";
import { NewAttractionModal } from "@/components/NewAttractionModal/NewAttractionModal";
import { AddResidenceModal } from "@/components/AddResidenceModal/AddResidenceModal";
import { AddFlightModal } from "@/components/AddFlightModal/AddFlightModal";
import { FlightsList } from "./FlightsList";
import { ResidencesList } from "./ResidencesList";
import { CalendarSection } from "./CalendarSection";
import { AttractionDetailModal } from "@/components/AttractionDetailModal/AttractionDetailModal";
import { AttractionSearchModal } from "@/components/AttractionSearchModal/AttractionSearchModal";
import { ICONS } from "@/components/NewAttractionModal/AttractionTypeChip";
import { DEFAULT_OPENING_HOURS } from "@/components/NewAttractionModal/attraction.constants";
import { useAuth } from "@/contexts/AuthContext";
import { formatDisplayDate } from "@/lib/formatDate";
import { currencySymbol } from "@/lib/formatCurrency";
import type { ResidenceFormData, ResidenceInitialData } from "@/components/AddResidenceModal/AddResidenceModal.types";
import type { FlightFormData, FlightInitialData } from "@/components/AddFlightModal/AddFlightModal.types";
import { ATTRACTIONS_PAGE_SIZE } from "@/config/ui";
import type { Trip } from "@/types/trip";
import type { Attraction } from "@/types/attraction";
import type {
  AttractionFormData,
  AttractionType,
  DurationUnit,
  OpeningHours,
} from "@/components/NewAttractionModal/attraction.types";
import styles from "./TripDetailClient.module.css";

interface TripDetailClientProps {
  tripId: string;
}

export function TripDetailClient({ tripId }: TripDetailClientProps) {
  const { token, user: authUser } = useAuth();
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [tripLoading, setTripLoading] = useState(true);

  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [attractionsLoading, setAttractionsLoading] = useState(false);

  const [page, setPage] = useState(1);

  const [searchModalOpen, setSearchModalOpen]       = useState(false);
  const [modalOpen, setModalOpen]                   = useState(false);
  const [residenceModalOpen, setResidenceModalOpen] = useState(false);
  const [flightModalOpen, setFlightModalOpen]       = useState(false);
  const [editingAttraction, setEditingAttraction]   = useState<Attraction | null>(null);
  const [editingResidence, setEditingResidence]     = useState<Attraction | null>(null);
  const [editingFlight, setEditingFlight]           = useState<Attraction | null>(null);
  const [viewingAttraction, setViewingAttraction]   = useState<Attraction | null>(null);

  // Fetch trip
  useEffect(() => {
    if (!token) return;
    fetch(`/api/trips/${tripId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 404) { router.replace("/trips"); return null; }
        return res.json() as Promise<Trip>;
      })
      .then((data) => { if (data) setTrip(data); })
      .catch(() => router.replace("/trips"))
      .finally(() => setTripLoading(false));
  }, [token, tripId, router]);

  // Fetch attractions once trip is loaded
  useEffect(() => {
    if (!token || !trip) return;
    setAttractionsLoading(true);
    fetch(`/api/trips/${trip._id}/attractions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data: Attraction[]) => setAttractions(Array.isArray(data) ? data : []))
      .catch(() => setAttractions([]))
      .finally(() => setAttractionsLoading(false));
  }, [token, trip]);

  async function handleSearchAdd(existing: Attraction) {
    if (!token || !trip) return;
    setSearchModalOpen(false);
    try {
      const res = await fetch(`/api/trips/${trip._id}/attractions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: existing.name,
          country: existing.country,
          city: existing.city,
          coordinates: existing.coordinates,
          types: existing.types,
          durationValue: existing.durationValue || undefined,
          durationUnit: existing.durationUnit || undefined,
          price: existing.price ?? undefined,
          openingHours: existing.openingHours ?? undefined,
          notes: existing.notes || undefined,
          photoUrl: existing.photoUrl || undefined,
        }),
      });
      if (res.ok) {
        const created = (await res.json()) as Attraction;
        setAttractions((prev) => [created, ...prev]);
      }
    } catch {
      // silent
    }
  }

  function handleSearchCreateNew() {
    setSearchModalOpen(false);
    setModalOpen(true);
  }

  async function handleResidenceSave(data: ResidenceFormData) {
    if (!token || !trip) return;
    try {
      const res = await fetch(`/api/trips/${trip._id}/attractions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = (await res.json()) as Attraction;
        setAttractions((prev) => [created, ...prev]);
      }
    } catch { /* silent */ }
  }

  async function handleFlightSave(data: FlightFormData) {
    if (!token || !trip) return;
    try {
      const res = await fetch(`/api/trips/${trip._id}/attractions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = (await res.json()) as Attraction;
        setAttractions((prev) => [created, ...prev]);
      }
    } catch { /* silent */ }
  }

  async function handleResidenceUpdate(data: ResidenceFormData) {
    if (!token || !editingResidence) return;
    const id = editingResidence._id;
    setEditingResidence(null);
    try {
      const res = await fetch(`/api/attractions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = (await res.json()) as Attraction;
        setAttractions((prev) => prev.map((a) => a._id !== updated._id ? a : {
          ...updated,
          plannedDate: a.plannedDate,
          plannedTime: a.plannedTime,
        }));
      }
    } catch { /* silent */ }
  }

  async function handleFlightUpdate(data: FlightFormData) {
    if (!token || !editingFlight) return;
    const id = editingFlight._id;
    setEditingFlight(null);
    try {
      const res = await fetch(`/api/attractions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = (await res.json()) as Attraction;
        // Use the full updated response — flight's calendar position updates to match new departure time
        setAttractions((prev) => prev.map((a) => a._id !== updated._id ? a : updated));
      }
    } catch { /* silent */ }
  }

  async function handleAttractionSave(data: AttractionFormData) {
    if (!token || !trip) return;
    setModalOpen(false);

    try {
      const res = await fetch(`/api/trips/${trip._id}/attractions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: data.name,
          country: data.country,
          city: data.city,
          coordinates: data.coordinates,
          types: data.types,
          durationValue: data.durationValue || undefined,
          durationUnit: data.durationUnit,
          price: data.price,
          openingHours: data.openingHours,
          notes: data.notes || undefined,
          photoUrl: data.photoUrl || undefined,
        }),
      });

      if (res.ok) {
        const created = (await res.json()) as Attraction;
        setAttractions((prev) => [created, ...prev]);
      }
    } catch {
      // Silent failure — attraction list won't update but no crash
    }
  }

  function attractionToFormData(a: Attraction): AttractionFormData {
    return {
      name: a.name,
      country: a.country,
      city: a.city,
      coordinates: a.coordinates ?? null,
      types: (a.types ?? []) as AttractionType[],
      durationValue: a.durationValue ?? "",
      durationUnit: (a.durationUnit ?? "hours") as DurationUnit,
      price: a.price ?? null,
      openingHours: (a.openingHours as OpeningHours | undefined)?.Mon
        ? (a.openingHours as OpeningHours)
        : structuredClone(DEFAULT_OPENING_HOURS),
      notes: a.notes ?? "",
      photoUrl: a.photoUrl ?? "",
    };
  }

  async function handleAttractionUpdate(data: AttractionFormData) {
    if (!token || !editingAttraction) return;
    const id = editingAttraction._id;
    setEditingAttraction(null);

    try {
      const res = await fetch(`/api/attractions/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = (await res.json()) as Attraction;
        setAttractions((prev) =>
          prev.map((a) => {
            if (a._id !== updated._id) return a;
            return {
              ...updated,
              plannedDate: a.plannedDate,
              plannedTime: a.plannedTime,
              actualDurationValue: a.actualDurationValue,
              actualDurationUnit: a.actualDurationUnit,
            };
          })
        );
      }
    } catch {
      // Silent — stale data remains until next page load
    }
  }

  async function handleRemoveAttraction(attractionId: string) {
    // Optimistic update
    const snapshot = attractions;
    setAttractions((prev) => prev.filter((a) => a._id !== attractionId));
    setPage((p) => Math.min(p, Math.max(1, Math.ceil((attractions.length - 1) / ATTRACTIONS_PAGE_SIZE))));

    try {
      const res = await fetch(`/api/attractions/${attractionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      if (!res.ok) setAttractions(snapshot); // Restore on failure
    } catch {
      setAttractions(snapshot);
    }
  }

  // Stable initial-data objects — must be hooks, so they live before any early returns
  const residenceInitialData = useMemo<ResidenceInitialData | undefined>(() => {
    if (!editingResidence) return undefined;
    return {
      name:          editingResidence.name,
      residenceType: (editingResidence.residenceType as ResidenceInitialData["residenceType"]) ?? "Other",
      city:          editingResidence.city,
      coordinates:   editingResidence.coordinates ?? null,
      checkInDate:   editingResidence.checkInDate  ?? "",
      checkOutDate:  editingResidence.checkOutDate ?? "",
      price:         editingResidence.price ?? null,
      notes:         editingResidence.notes ?? "",
    };
  }, [editingResidence]);

  const flightInitialData = useMemo<FlightInitialData | undefined>(() => {
    if (!editingFlight) return undefined;
    const depDate = editingFlight.departureTime?.split("T")[0] ?? editingFlight.plannedDate ?? "";
    const depHHMM = editingFlight.departureTime?.split("T")[1]?.slice(0, 5) ?? editingFlight.plannedTime ?? "";
    const arrHHMM = editingFlight.arrivalTime?.split("T")[1]?.slice(0, 5) ?? "";
    return {
      airline:           editingFlight.airline           ?? "",
      flightNumber:      editingFlight.flightNumber      ?? "",
      flightDate:        depDate,
      departureAirport:  editingFlight.departureAirport  ?? "",
      departureTimeHHMM: depHHMM,
      arrivalAirport:    editingFlight.arrivalAirport    ?? "",
      arrivalTimeHHMM:   arrHHMM,
      price:             editingFlight.price ?? null,
      notes:             editingFlight.notes ?? "",
    };
  }, [editingFlight]);

  if (tripLoading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={32} className={styles.loadingIcon} aria-hidden="true" />
      </div>
    );
  }

  if (!trip) return null;

  const { name, country, coverImage, startDate, endDate, moods, budget, currency } = trip;
  const isOwner = !!authUser && authUser._id === trip.ownerId;

  const flightAttractions    = attractions.filter((a) => a.subtype === "flight"    || a.types?.[0] === "Flight");
  const residenceAttractions = attractions.filter((a) => a.subtype === "residence");
  const regularAttractions   = attractions.filter((a) => !a.subtype && a.types?.[0] !== "Flight");

  const totalPages = Math.ceil(regularAttractions.length / ATTRACTIONS_PAGE_SIZE);
  const paginatedAttractions = regularAttractions.slice((page - 1) * ATTRACTIONS_PAGE_SIZE, page * ATTRACTIONS_PAGE_SIZE);

  return (
    <>
      <main className={styles.page}>
        <div className={styles.hero}>
          {coverImage ? (
            <Image
              src={coverImage}
              alt={`${name} cover`}
              fill
              className={styles.heroImage}
              sizes="100vw"
              priority
            />
          ) : (
            <div className={styles.heroPlaceholder} aria-hidden="true" />
          )}
          <div className={styles.heroOverlay} aria-hidden="true" />
          <div className={styles.heroContent}>
            <Link href="/trips" className={styles.backLink}>
              <ChevronLeft size={16} aria-hidden="true" />
              My Trips
            </Link>
            {isOwner && (
              <Link href={`/trips/${trip._id}/edit`} className={styles.heroEditBtn}>
                <PenLine size={13} aria-hidden="true" />
                Edit trip
              </Link>
            )}
            <h1 className={styles.destination}>{name}</h1>
            <div className={styles.tags}>
              {moods.map((tag) => (
                <MoodTagChip key={tag} tag={tag} />
              ))}
            </div>
          </div>
        </div>

        <div className={styles.container}>
          {/* Trip overview card */}
          <div className={styles.card}>
            <h2 className={styles.sectionHeading}>Trip Overview</h2>

            <dl className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <dt className={styles.infoLabel}>
                  <Globe size={14} aria-hidden="true" />
                  Country
                </dt>
                <dd className={styles.infoValue}>{country}</dd>
              </div>

              <div className={styles.infoItem}>
                <dt className={styles.infoLabel}>
                  <Calendar size={14} aria-hidden="true" />
                  Dates
                </dt>
                <dd className={styles.infoValue}>
                  {formatDisplayDate(startDate)} – {formatDisplayDate(endDate)}
                </dd>
              </div>

              {budget !== undefined && budget !== null && (
                <div className={styles.infoItem}>
                  <dt className={styles.infoLabel}>
                    <DollarSign size={14} aria-hidden="true" />
                    Budget
                  </dt>
                  <dd className={styles.infoValue}>
                    {currency && <span className={styles.currencyBadge}>{currencySymbol(currency)}</span>}
                    {budget.toLocaleString()}
                  </dd>
                </div>
              )}

              <div className={styles.infoItem}>
                <dt className={styles.infoLabel}>
                  <MapPinned size={14} aria-hidden="true" />
                  Attractions
                </dt>
                <dd className={styles.infoValue}>{regularAttractions.length} added</dd>
              </div>
            </dl>
          </div>

          {/* Flights section */}
          <FlightsList
            flights={flightAttractions}
            isOwner={isOwner}
            onAdd={() => setFlightModalOpen(true)}
            onEdit={(a) => setEditingFlight(a)}
            onRemove={handleRemoveAttraction}
            onView={(a) => setViewingAttraction(a)}
          />

          {/* Residences section */}
          <ResidencesList
            residences={residenceAttractions}
            isOwner={isOwner}
            onAdd={() => setResidenceModalOpen(true)}
            onEdit={(a) => setEditingResidence(a)}
            onRemove={handleRemoveAttraction}
            onView={(a) => setViewingAttraction(a)}
          />

          {/* Attractions card */}
          <div className={styles.card}>
            <div className={styles.attractionsHeader}>
              <h2 className={styles.sectionHeading}>Attractions</h2>
              {isOwner && <button
                className={styles.addBtn}
                type="button"
                onClick={() => setSearchModalOpen(true)}
                aria-label="Add an attraction to this trip"
              >
                <Plus size={14} aria-hidden="true" />
                Add Attraction
              </button>}
            </div>

            {attractionsLoading ? (
              <div className={styles.attractionsLoading}>
                <Loader2 size={22} className={styles.loadingIcon} aria-hidden="true" />
              </div>
            ) : regularAttractions.length === 0 ? (
              <div className={styles.emptyAttractions}>
                <MapPinned size={36} className={styles.emptyIcon} aria-hidden="true" />
                <p className={styles.emptyText}>No attractions added yet.</p>
                <p className={styles.emptySubtext}>
                  Start building your itinerary by adding places to visit.
                </p>
              </div>
            ) : (
              <>
              <ul className={styles.attractionList} aria-label="Attraction list">
                {paginatedAttractions.map((attraction) => {
                  const firstType = attraction.types[0] as AttractionType | undefined;
                  const icon = firstType ? ICONS[firstType] : null;
                  const durationLabel = attraction.durationValue
                    ? `${attraction.durationValue} ${attraction.durationUnit ?? "h"}` : null;
                  const priceLabel = attraction.price != null ? `$${attraction.price}` : null;
                  const metaLine = [
                    attraction.types.join(", "),
                    attraction.city || null,
                    durationLabel,
                    priceLabel,
                  ].filter(Boolean).join(" · ");

                  return (
                    <li
                      key={attraction._id}
                      className={styles.attractionItem}
                      onClick={() => setViewingAttraction(attraction)}
                      role="button"
                      tabIndex={0}
                      aria-label={`View details for ${attraction.name}`}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setViewingAttraction(attraction); } }}
                    >
                      <div className={styles.attractionIconCircle} aria-hidden="true">
                        {icon}
                      </div>
                      <div className={styles.attractionInfo}>
                        <span className={styles.attractionName}>{attraction.name}</span>
                        <span className={styles.attractionMeta}>{metaLine}</span>
                        {attraction.notes && (
                          <span className={styles.attractionNotes}>{attraction.notes}</span>
                        )}
                      </div>
                      {attraction.photoUrl?.startsWith("http") && (
                        <div className={styles.attractionThumb} aria-hidden="true">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={attraction.photoUrl} alt="" className={styles.attractionThumbImg} />
                        </div>
                      )}
                      {isOwner && (
                        <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className={styles.editBtn}
                            onClick={() => setEditingAttraction(attraction)}
                            aria-label={`Edit ${attraction.name}`}
                          >
                            <PenLine size={14} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className={styles.removeBtn}
                            onClick={() => handleRemoveAttraction(attraction._id)}
                            aria-label={`Remove ${attraction.name}`}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    type="button"
                    className={`${styles.paginationBtn} ${page === 1 ? styles.paginationBtnDisabled : ""}`}
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                    aria-label="Go to previous page"
                  >
                    <ChevronLeft size={14} aria-hidden="true" />
                    Previous
                  </button>
                  <span
                    className={styles.paginationInfo}
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className={`${styles.paginationBtn} ${page === totalPages ? styles.paginationBtnDisabled : ""}`}
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === totalPages}
                    aria-label="Go to next page"
                  >
                    Next
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                </div>
              )}
              </>
            )}
          </div>
        </div>

        {/* ── Calendar / Itinerary section ── */}
        <CalendarSection
          trip={trip}
          attractions={attractions}
          onAttractionsChange={setAttractions}
          token={token ?? ""}
          isOwner={isOwner}
        />
      </main>

      <AttractionSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        country={trip.country}
        onAdd={handleSearchAdd}
        onCreateNew={handleSearchCreateNew}
      />

      <NewAttractionModal
        isOpen={modalOpen || editingAttraction !== null}
        onClose={() => { setModalOpen(false); setEditingAttraction(null); }}
        onSave={editingAttraction ? handleAttractionUpdate : handleAttractionSave}
        defaultCountry={trip.country}
        initialData={editingAttraction ? attractionToFormData(editingAttraction) : undefined}
      />

      <AttractionDetailModal
        attraction={viewingAttraction}
        onClose={() => setViewingAttraction(null)}
      />

      <AddResidenceModal
        isOpen={residenceModalOpen || !!editingResidence}
        onClose={() => { setResidenceModalOpen(false); setEditingResidence(null); }}
        onSave={editingResidence ? handleResidenceUpdate : handleResidenceSave}
        tripCountry={trip.country}
        tripCity={trip.cities?.[0]}
        tripStartDate={trip.startDate}
        tripEndDate={trip.endDate}
        currency={trip.currency}
        initialData={residenceInitialData}
      />

      <AddFlightModal
        isOpen={flightModalOpen || !!editingFlight}
        onClose={() => { setFlightModalOpen(false); setEditingFlight(null); }}
        onSave={editingFlight ? handleFlightUpdate : handleFlightSave}
        tripCountry={trip.country}
        tripCity={trip.cities?.[0]}
        tripStartDate={trip.startDate}
        tripEndDate={trip.endDate}
        currency={trip.currency}
        initialData={flightInitialData}
      />
    </>
  );
}
