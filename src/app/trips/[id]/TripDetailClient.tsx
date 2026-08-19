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
  Users,
  Lock,
  AlertCircle,
  LayoutDashboard,
  BedDouble,
  Plane,
  MapPin,
  SearchX,
  Check,
} from "lucide-react";
import {
  MoodTagChip,
  PrivateChip,
  NewAttractionModal,
  AddResidenceModal,
  AddFlightModal,
  AttractionDetailModal,
  AttractionSearchModal,
  AttractionFilter,
  DEFAULT_OPENING_HOURS,
  renderTypeIcon,
  TripTabBar,
  FormErrorBanner,
  ImageWithSkeleton,
  WebsiteLinkButton,
} from "@/components";
import type {
  ResidenceFormData,
  ResidenceInitialData,
  ResidencePrefillData,
  FlightFormData,
  FlightInitialData,
  AttractionFormData,
  AttractionType,
  DurationUnit,
  OpeningHours,
} from "@/components";
import { FlightsList } from "./FlightsList";
import { ResidencesList } from "./ResidencesList";
import { CalendarSection } from "./CalendarSection";
import { useAttractionTypes } from "@/hooks";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  getTrip,
  getTripAttractions,
  addAttractionToTrip,
  updateAttraction,
  updateTripAttractionSchedule,
  removeAttractionFromTrip,
  markAttractionVisited,
  unmarkAttractionVisited,
} from "@/services";
import { formatDisplayDate, currencySymbol, formatPrice } from "@/lib";
import { ATTRACTIONS_PAGE_SIZE } from "@/config/ui";
import type { Trip } from "@/types/trip";
import type { Attraction } from "@/types/attraction";
import styles from "./TripDetailClient.module.css";

const TRIP_TABS = [
  { id: "overview",    label: "Overview",    Icon: LayoutDashboard },
  { id: "attractions", label: "Attractions", Icon: MapPin          },
  { id: "flights",     label: "Flights",     Icon: Plane           },
  { id: "residences",  label: "Residences",  Icon: BedDouble       },
] as const;

type TripTabId = typeof TRIP_TABS[number]["id"];
const VALID_TAB_IDS = new Set<string>(TRIP_TABS.map((t) => t.id));

interface TripDetailClientProps {
  tripId: string;
}

export function TripDetailClient({ tripId }: TripDetailClientProps) {
  const { findType, types } = useAttractionTypes();
  const { token, user: authUser, loading: authLoading } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [tripLoading, setTripLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [tripReloadKey, setTripReloadKey] = useState(0);

  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [attractionsLoading, setAttractionsLoading] = useState(false);
  const [attractionsLoadError, setAttractionsLoadError] = useState(false);
  const [attractionsReloadKey, setAttractionsReloadKey] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  const [page, setPage] = useState(1);

  const [activeTab, setActiveTab] = useState<TripTabId>("overview");

  // Read initial tab from URL on mount (client-side only — no Suspense needed)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && VALID_TAB_IDS.has(tab)) setActiveTab(tab as TripTabId);
  }, []);

  function switchTab(id: string) {
    setActiveTab(id as TripTabId);
    window.history.replaceState({}, "", `?tab=${id}`);
  }

  const [searchModalOpen, setSearchModalOpen]       = useState(false);
  const [modalOpen, setModalOpen]                   = useState(false);
  const [residenceSearchOpen, setResidenceSearchOpen] = useState(false);
  const [residenceModalOpen, setResidenceModalOpen] = useState(false);
  const [residencePrefill, setResidencePrefill]     = useState<ResidencePrefillData | undefined>(undefined);
  const [flightModalOpen, setFlightModalOpen]       = useState(false);
  const [editingAttraction, setEditingAttraction]   = useState<Attraction | null>(null);
  const [editingResidence, setEditingResidence]     = useState<Attraction | null>(null);
  const [editingFlight, setEditingFlight]           = useState<Attraction | null>(null);
  const [viewingAttraction, setViewingAttraction]   = useState<Attraction | null>(null);

  const [searchQuery, setSearchQuery]             = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes]         = useState<string[]>([]);

  // Fetch trip — waits for auth to settle so token-less unauthenticated users
  // aren't confused with still-loading authenticated users
  useEffect(() => {
    if (authLoading) return;
    setTripLoading(true);
    setLoadError(false);
    getTrip(tripId, token)
      .then((res) => {
        if (res.status === 404) { router.replace("/trips"); return null; }
        if (res.status === 403) { setForbidden(true); return null; }
        if (!res.ok) { setLoadError(true); return null; }
        return res.json() as Promise<Trip>;
      })
      .then((data) => { if (data) setTrip(data); })
      .catch(() => router.replace("/trips"))
      .finally(() => setTripLoading(false));
  }, [authLoading, token, tripId, router, tripReloadKey]);

  // Fetch attractions once trip is loaded (works with or without a token)
  useEffect(() => {
    if (!trip) return;
    setAttractionsLoading(true);
    setAttractionsLoadError(false);
    getTripAttractions(trip._id, token)
      .then((data) => setAttractions(Array.isArray(data) ? (data as Attraction[]) : []))
      .catch(() => setAttractionsLoadError(true))
      .finally(() => setAttractionsLoading(false));
  }, [token, trip, attractionsReloadKey]);

  // The backend no-ops (returns the existing document, doesn't re-link) when an attraction is
  // already on the trip — e.g. re-picking one via search, or a residence/flight save that
  // resolves by name+country to an already-added document. Prepending unconditionally would
  // duplicate it in the on-screen list even though the DB stayed correct, so replace in place
  // for an already-present id instead of always prepending.
  function upsertAttraction(created: Attraction) {
    setAttractions((prev) => {
      const idx = prev.findIndex((a) => a._id === created._id);
      if (idx === -1) return [created, ...prev];
      const next = [...prev];
      next[idx] = created;
      return next;
    });
  }

  async function handleSearchAdd(existing: Attraction[]) {
    if (!token || !trip) return;
    setSearchModalOpen(false);
    setActionError(null);
    // Search results carry the shared attraction document's own id — compare against the
    // real doc ids already linked to this trip to detect "adding again" (a 2nd+ instance).
    const linkedIds = new Set(attractions.map((a) => a.attractionId ?? a._id));
    try {
      for (const attraction of existing) {
        const created = (await addAttractionToTrip(trip._id, token, {
          existingAttractionId: attraction._id,
          allowDuplicate: linkedIds.has(attraction._id),
        })) as Attraction;
        upsertAttraction(created);
      }
    } catch {
      setActionError("Couldn't add that attraction. Please try again.");
    }
  }

  function handleSearchCreateNew() {
    setSearchModalOpen(false);
    setModalOpen(true);
  }

  function handleResidenceSearchPick(picked: Attraction[]) {
    const existing = picked[0];
    if (!existing) return;
    setResidenceSearchOpen(false);
    setResidencePrefill({
      existingAttractionId: existing._id,
      name: existing.name,
      city: existing.city ?? "",
      coordinates: existing.coordinates ?? null,
      residenceType: (existing.residenceType as ResidencePrefillData["residenceType"]) ?? "Hotel",
    });
    setResidenceModalOpen(true);
  }

  function handleResidenceSearchCreateNew() {
    setResidenceSearchOpen(false);
    setResidencePrefill(undefined);
    setResidenceModalOpen(true);
  }

  async function handleResidenceSave(data: ResidenceFormData) {
    if (!token || !trip) return;
    setActionError(null);
    try {
      const created = (await addAttractionToTrip(trip._id, token, data)) as Attraction;
      upsertAttraction(created);
      setResidencePrefill(undefined);
      toast.success("Residence added");
    } catch {
      setActionError("Couldn't save the residence. Please try again.");
    }
  }

  async function handleFlightSave(data: FlightFormData) {
    if (!token || !trip) return;
    setActionError(null);
    try {
      const created = (await addAttractionToTrip(trip._id, token, data)) as Attraction;
      upsertAttraction(created);
      toast.success("Flight added");
    } catch {
      setActionError("Couldn't save the flight. Please try again.");
    }
  }

  async function handleResidenceUpdate(data: ResidenceFormData) {
    if (!token || !editingResidence || !trip) return;
    // The row id (schedule key) may be a synthetic 2nd+ instance key — the shared
    // Attraction document must be addressed by its own real id, not the row's.
    const id = editingResidence._id;
    const realId = editingResidence.attractionId ?? editingResidence._id;
    setEditingResidence(null);
    setActionError(null);
    try {
      // Reusable place data (name/location/residenceType) goes on the shared Attraction
      // document; this trip's stay dates/price/notes are specific to THIS booking and
      // live only in this trip's schedule entry — never on the shared document, which
      // other trips may also reference.
      const attrUpdated = (await updateAttraction(realId, token, {
        name: data.name,
        country: data.country,
        city: data.city,
        coordinates: data.coordinates,
        residenceType: data.residenceType,
        types: data.types,
        subtype: data.subtype,
        websiteUrl: data.websiteUrl || undefined,
      })) as Attraction;

      const schedRes = await updateTripAttractionSchedule(trip._id, id, token, {
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        price: data.price,
        currency: data.currency,
        notes: data.notes,
      });

      const updated = schedRes.ok ? ((await schedRes.json()) as Attraction) : attrUpdated;
      setAttractions((prev) => prev.map((a) => a._id !== updated._id ? a : updated));
      toast.success("Residence updated");
    } catch {
      setActionError("Couldn't update the residence. Please try again.");
    }
  }

  async function handleFlightUpdate(data: FlightFormData) {
    if (!token || !editingFlight || !trip) return;
    const id = editingFlight._id;
    setEditingFlight(null);
    setActionError(null);
    try {
      // Flights are trip-scoped only (schedules.<fl-id>, no Attraction document) — a
      // single PATCH against the schedule entry covers every field, unlike residences/
      // regular attractions which still need the separate PUT + PATCH two-step.
      const schedRes = await updateTripAttractionSchedule(trip._id, id, token, data);
      if (!schedRes.ok) throw new Error("Failed to update flight");
      const updated = (await schedRes.json()) as Attraction;
      setAttractions((prev) => prev.map((a) => a._id !== updated._id ? a : updated));
      toast.success("Flight updated");
    } catch {
      setActionError("Couldn't update the flight. Please try again.");
    }
  }

  async function handleAttractionSave(data: AttractionFormData) {
    if (!token || !trip) return;
    setModalOpen(false);
    setActionError(null);

    try {
      const created = (await addAttractionToTrip(trip._id, token, {
        name: data.name,
        country: data.country,
        city: data.city,
        coordinates: data.coordinates,
        types: data.types,
        durationValue: data.durationValue || undefined,
        durationUnit: data.durationUnit,
        price: data.price,
        currency: data.currency,
        openingHours: data.openingHours,
        notes: data.notes || undefined,
        photoUrl: data.photoUrl || undefined,
        websiteUrl: data.websiteUrl || undefined,
      })) as Attraction;
      upsertAttraction(created);
      toast.success("Attraction added");
    } catch {
      setActionError("Couldn't save the attraction. Please try again.");
    }
  }

  function attractionToFormData(a: Attraction): AttractionFormData {
    return {
      name: a.name,
      country: a.country,
      city: a.city ?? "",
      coordinates: a.coordinates ?? null,
      types: (a.types ?? []) as AttractionType[],
      durationValue: a.durationValue ?? "",
      durationUnit: (a.durationUnit ?? "hours") as DurationUnit,
      price: a.price ?? null,
      currency: a.currency ?? "USD",
      openingHours: (a.openingHours as OpeningHours | undefined)?.Mon
        ? (a.openingHours as OpeningHours)
        : structuredClone(DEFAULT_OPENING_HOURS),
      notes: a.notes ?? "",
      photoUrl: a.photoUrl ?? "",
      websiteUrl: a.websiteUrl ?? "",
    };
  }

  async function handleAttractionUpdate(data: AttractionFormData) {
    if (!token || !editingAttraction) return;
    // The row id (schedule key) may be a synthetic 2nd+ instance key — the shared
    // Attraction document must be addressed by its own real id, not the row's.
    const realId = editingAttraction.attractionId ?? editingAttraction._id;
    setEditingAttraction(null);
    setActionError(null);

    try {
      const updated = (await updateAttraction(realId, token, data)) as Attraction;
      setAttractions((prev) =>
        prev.map((a) => {
          // Shared-document fields apply to every scheduled instance of this attraction,
          // not just the row that was open in the edit modal.
          if ((a.attractionId ?? a._id) !== realId) return a;
          return {
            ...updated,
            _id: a._id,
            attractionId: realId,
            plannedDate: a.plannedDate,
            plannedTime: a.plannedTime,
            actualDurationValue: a.actualDurationValue,
            actualDurationUnit: a.actualDurationUnit,
          };
        })
      );
      toast.success("Attraction updated");
    } catch {
      setActionError("Couldn't update the attraction. Please try again.");
    }
  }

  async function handleRemoveAttraction(attractionId: string) {
    if (!trip) return;
    setActionError(null);

    // The Attractions tab shows one row per unique attraction (see regularAttractions),
    // but a single attraction can have multiple scheduled instances (see "Schedule again"
    // in the Calendar tab) — removing it here should remove every instance, not just the
    // one representative row that happened to be clicked. For flights/residences (never
    // duplicated) this resolves to exactly the one row, unchanged from before.
    const clicked = attractions.find((a) => a._id === attractionId);
    const realId = clicked?.attractionId ?? attractionId;
    const instanceIds = attractions
      .filter((a) => (a.attractionId ?? a._id) === realId)
      .map((a) => a._id);

    // Optimistic update
    const snapshot = attractions;
    setAttractions((prev) => prev.filter((a) => (a.attractionId ?? a._id) !== realId));
    setPage((p) => Math.min(p, Math.max(1, Math.ceil((attractions.length - instanceIds.length) / ATTRACTIONS_PAGE_SIZE))));

    try {
      // Unlinks from this trip — does NOT delete the global attraction from the DB.
      // Sequential, not Promise.all: each call's "is this the last instance?" check
      // reads the trip fresh from the DB, so firing them concurrently races — an
      // earlier call can read stale schedules (before a later call's delete lands)
      // and wrongly conclude the attraction is still referenced, leaving it linked.
      const results = [];
      for (const id of instanceIds) {
        results.push(await removeAttractionFromTrip(trip._id, id, token));
      }
      if (results.some((res) => !res.ok)) {
        setAttractions(snapshot);
        setActionError("Couldn't remove the attraction. Please try again.");
      }
    } catch {
      setAttractions(snapshot);
      setActionError("Couldn't remove the attraction. Please try again.");
    }
  }

  // "Visited" is a per-user fact about the shared attraction document, not the schedule
  // instance/row — flip it on every row that shares the same real attraction id (mirrors
  // the same propagation rule used for shared-doc edits in handleAttractionUpdate), plus
  // the detail modal if it's currently showing this attraction.
  async function handleToggleVisited(attraction: Attraction) {
    if (!token || !attraction.attractionId) return;
    const realId = attraction.attractionId;
    const next = !attraction.isVisited;

    setAttractions((prev) =>
      prev.map((a) => (a.attractionId ?? a._id) === realId ? { ...a, isVisited: next } : a)
    );
    setViewingAttraction((prev) =>
      prev && (prev.attractionId ?? prev._id) === realId ? { ...prev, isVisited: next } : prev
    );

    try {
      if (next) await markAttractionVisited(realId, token);
      else await unmarkAttractionVisited(realId, token);
    } catch {
      setAttractions((prev) =>
        prev.map((a) => (a.attractionId ?? a._id) === realId ? { ...a, isVisited: !next } : a)
      );
      setViewingAttraction((prev) =>
        prev && (prev.attractionId ?? prev._id) === realId ? { ...prev, isVisited: !next } : prev
      );
      toast.error("Couldn't update visited status. Please try again.");
    }
  }

  // Stable initial-data objects — must be hooks, so they live before any early returns
  const residenceInitialData = useMemo<ResidenceInitialData | undefined>(() => {
    if (!editingResidence) return undefined;
    return {
      name:          editingResidence.name,
      residenceType: (editingResidence.residenceType as ResidenceInitialData["residenceType"]) ?? "Other",
      city:          editingResidence.city ?? "",
      coordinates:   editingResidence.coordinates ?? null,
      checkInDate:   editingResidence.checkInDate  ?? "",
      checkOutDate:  editingResidence.checkOutDate ?? "",
      price:         editingResidence.price ?? null,
      currency:      editingResidence.currency ?? "USD",
      notes:         editingResidence.notes ?? "",
      websiteUrl:    editingResidence.websiteUrl ?? "",
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
      currency:          editingFlight.currency ?? "USD",
      notes:             editingFlight.notes ?? "",
    };
  }, [editingFlight]);

  const regularAttractions = useMemo(() => {
    // An attraction can have multiple scheduled instances (see "Schedule again" in the
    // Calendar tab) — the Attractions tab is a list of distinct attractions, not
    // schedule instances, so dedupe to one representative row per real attraction id.
    const seen = new Set<string>();
    const result: Attraction[] = [];
    for (const a of attractions) {
      if (a.subtype || a.types?.[0] === "Flight") continue;
      const key = a.attractionId ?? a._id;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(a);
    }
    return result;
  }, [attractions]);

  const presentCategories = useMemo(
    () => [...new Set(
      regularAttractions.flatMap((a) =>
        a.types.map((t) => findType(t)?.category).filter((c): c is string => Boolean(c))
      )
    )],
    [regularAttractions, findType]
  );

  // Types actually present on this trip's attractions — only these show as chips,
  // same pattern as Explore's availableTypes.
  const presentTypes = useMemo(() => {
    const nameSet = new Set(regularAttractions.flatMap((a) => a.types));
    return types.filter((t) => nameSet.has(t.name));
  }, [regularAttractions, types]);

  // Dropping a category also drops any selected types that belong to it — mirrors
  // ExploreClient.tsx's handleCategoriesChange (see docs/LEARNINGS.md) so a type chip
  // left selected under a removed category doesn't keep filtering silently.
  function handleCategoriesChange(next: string[]) {
    const removed = selectedCategories.filter((c) => !next.includes(c));
    setSelectedCategories(next);
    if (removed.length > 0) {
      setSelectedTypes((prev) => prev.filter((t) => {
        const cat = findType(t)?.category;
        return !cat || !removed.includes(cat);
      }));
    }
  }

  const filteredAttractions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return regularAttractions
      .filter((a) => {
        const matchesText = !q || a.name.toLowerCase().includes(q);
        const matchesCategory =
          selectedCategories.length === 0 ||
          a.types.some((t) => {
            const cat = findType(t)?.category;
            return cat && selectedCategories.includes(cat);
          });
        const matchesType =
          selectedTypes.length === 0 || a.types.some((t) => selectedTypes.includes(t));
        return matchesText && matchesCategory && matchesType;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [regularAttractions, searchQuery, selectedCategories, selectedTypes, findType]);

  useEffect(() => { setPage(1); }, [searchQuery, selectedCategories, selectedTypes]);

  if (forbidden) {
    return (
      <div className={styles.forbiddenState}>
        <Lock size={40} className={styles.forbiddenIcon} aria-hidden="true" />
        <h1 className={styles.forbiddenHeading}>This trip is private</h1>
        <p className={styles.forbiddenBody}>You don&apos;t have permission to view this trip.</p>
        <Link href="/trips" className={styles.forbiddenBack}>
          <ChevronLeft size={16} aria-hidden="true" />
          Back to my trips
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.forbiddenState}>
        <AlertCircle size={40} className={styles.forbiddenIcon} aria-hidden="true" />
        <h1 className={styles.forbiddenHeading}>Couldn&apos;t load this trip</h1>
        <p className={styles.forbiddenBody}>Something went wrong. Please try again.</p>
        <button
          type="button"
          className={styles.clearFiltersBtn}
          onClick={() => setTripReloadKey((k) => k + 1)}
        >
          Try again
        </button>
        <Link href="/trips" className={styles.forbiddenBack}>
          <ChevronLeft size={16} aria-hidden="true" />
          Back to my trips
        </Link>
      </div>
    );
  }

  if (tripLoading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={32} className={styles.loadingIcon} aria-hidden="true" />
      </div>
    );
  }

  if (!trip) return null;

  const { name, country, coverImage, startDate, endDate, moods, budget, currency, ownerName, ownerAvatarUrl, collaborators, isPrivate } = trip;
  const isOwner        = !!authUser && authUser._id === trip.ownerId;
  const isCollaborator = !!authUser && !isOwner && (trip.collaborators ?? []).some((c) => c.userId === authUser._id);
  const canEdit        = isOwner || isCollaborator;

  const flightAttractions    = attractions.filter((a) => a.subtype === "flight"    || a.types?.[0] === "Flight");
  const residenceAttractions = attractions.filter((a) => a.subtype === "residence");

  const totalPages = Math.ceil(filteredAttractions.length / ATTRACTIONS_PAGE_SIZE);
  const paginatedAttractions = filteredAttractions.slice((page - 1) * ATTRACTIONS_PAGE_SIZE, page * ATTRACTIONS_PAGE_SIZE);

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
          {/* Navigation controls — top of hero */}
          <div className={styles.heroTopBar}>
            <Link href="/trips" className={styles.backLink}>
              <ChevronLeft size={16} aria-hidden="true" />
              My Trips
            </Link>
            {isPrivate && <PrivateChip size="xl" />}
          </div>

          {/* Hero text — bottom of hero */}
          <div className={styles.heroContent}>
            <h1 className={styles.destination}>{name}</h1>
            {moods.length > 0 && (
              <div className={styles.heroTagRow}>
                {moods.slice(0, 3).map((tag) => (
                  <MoodTagChip key={tag} tag={tag} />
                ))}
                {moods.length > 3 && (
                  <span className={styles.heroOverflowBadge}>+{moods.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <TripTabBar tabs={TRIP_TABS} active={activeTab} onChange={switchTab} />

        <div className={styles.container}>
          <FormErrorBanner message={actionError} />
          <div
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            className={styles.tabPanel}
          >
            {activeTab === "overview" && (
              <>
                <div className={styles.card}>
                  <div className={styles.attractionsHeader}>
                    <h2 className={styles.sectionHeading}>Trip Overview</h2>
                    {canEdit && (
                      <Link href={`/trips/${trip._id}/edit`} className={styles.cardEditLink}>
                        <PenLine size={13} aria-hidden="true" />
                        Edit trip
                      </Link>
                    )}
                  </div>

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

                  {(ownerName || (collaborators ?? []).length > 0) && (
                    <div className={styles.peopleRow}>
                      <span className={styles.peopleLabel}>
                        <Users size={14} aria-hidden="true" />
                        People
                      </span>
                      <div className={styles.peopleList}>
                        {ownerName && (
                          <div className={styles.personChip}>
                            <div className={styles.personAvatar} aria-hidden="true">
                              {ownerAvatarUrl ? (
                                <ImageWithSkeleton src={ownerAvatarUrl} alt="" width={28} height={28} className={styles.personAvatarImg} />
                              ) : (
                                ownerName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className={styles.personName}>{ownerName}</span>
                            <span className={styles.personRole}>Owner</span>
                          </div>
                        )}
                        {(collaborators ?? []).map((c) => (
                          <div key={c.userId} className={styles.personChip}>
                            <div className={styles.personAvatar} aria-hidden="true">
                              {c.avatarUrl ? (
                                <ImageWithSkeleton src={c.avatarUrl} alt="" width={28} height={28} className={styles.personAvatarImg} />
                              ) : (
                                c.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className={styles.personName}>{c.name}</span>
                            <span className={styles.personRole}>Contributor</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <CalendarSection
                  trip={trip}
                  attractions={attractions}
                  onAttractionsChange={setAttractions}
                  token={token ?? ""}
                  canEdit={canEdit}
                />
              </>
            )}

            {activeTab === "flights" && (
              <FlightsList
                flights={flightAttractions}
                canEdit={canEdit}
                onAdd={() => setFlightModalOpen(true)}
                onEdit={(a) => setEditingFlight(a)}
                onRemove={handleRemoveAttraction}
                onView={(a) => setViewingAttraction(a)}
              />
            )}

            {activeTab === "residences" && (
              <ResidencesList
                residences={residenceAttractions}
                canEdit={canEdit}
                onAdd={() => setResidenceSearchOpen(true)}
                onEdit={(a) => setEditingResidence(a)}
                onRemove={handleRemoveAttraction}
                onView={(a) => setViewingAttraction(a)}
              />
            )}

            {activeTab === "attractions" && (
              <>
                <div className={styles.card}>
                  <div className={styles.attractionsHeader}>
                    <h2 className={styles.sectionHeading}>Attractions</h2>
                    {canEdit && (
                      <button
                        className={styles.addBtn}
                        type="button"
                        onClick={() => setSearchModalOpen(true)}
                        aria-label="Add an attraction to this trip"
                      >
                        <Plus size={14} aria-hidden="true" />
                        Add Attraction
                      </button>
                    )}
                  </div>

                  {!attractionsLoading && regularAttractions.length > 0 && (
                    <AttractionFilter
                      searchValue={searchQuery}
                      onSearchChange={setSearchQuery}
                      collapsible
                      categories={presentCategories}
                      selectedCategories={selectedCategories}
                      onCategoriesChange={handleCategoriesChange}
                      categoryLabel="Categories"
                      types={presentTypes}
                      selectedTypes={selectedTypes}
                      onTypesChange={setSelectedTypes}
                      typeLabel="Types"
                      resultCount={filteredAttractions.length}
                    />
                  )}

                  {attractionsLoading ? (
                    <div className={styles.attractionsLoading}>
                      <Loader2 size={22} className={styles.loadingIcon} aria-hidden="true" />
                    </div>
                  ) : attractionsLoadError ? (
                    <div className={styles.emptyAttractions}>
                      <SearchX size={36} className={styles.emptyIcon} aria-hidden="true" />
                      <p className={styles.emptyText}>Couldn&apos;t load attractions</p>
                      <p className={styles.emptySubtext}>Something went wrong. Please try again.</p>
                      <button
                        type="button"
                        className={styles.clearFiltersBtn}
                        onClick={() => setAttractionsReloadKey((k) => k + 1)}
                      >
                        Try again
                      </button>
                    </div>
                  ) : regularAttractions.length === 0 ? (
                    <div className={styles.emptyAttractions}>
                      <MapPinned size={36} className={styles.emptyIcon} aria-hidden="true" />
                      <p className={styles.emptyText}>No attractions added yet.</p>
                      <p className={styles.emptySubtext}>
                        Start building your itinerary by adding places to visit.
                      </p>
                    </div>
                  ) : filteredAttractions.length === 0 ? (
                    <div className={styles.emptyAttractions}>
                      <SearchX size={28} className={styles.emptyIcon} aria-hidden="true" />
                      <p className={styles.emptyText}>No attractions match your search</p>
                      <p className={styles.emptySubtext}>Try a different name or category</p>
                      <button
                        type="button"
                        className={styles.clearFiltersBtn}
                        onClick={() => { setSearchQuery(""); setSelectedCategories([]); setSelectedTypes([]); }}
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    <>
                      <ul className={styles.attractionList} aria-label="Attraction list">
                        {paginatedAttractions.map((attraction) => {
                          const firstType = attraction.types[0] as AttractionType | undefined;
                          const icon = firstType ? renderTypeIcon(findType(firstType)?.icon ?? "Globe") : null;
                          const durationLabel = attraction.durationValue
                            ? `${attraction.durationValue} ${attraction.durationUnit ?? "h"}` : null;
                          const priceLabel = attraction.price != null ? formatPrice(attraction.price, attraction.currency ?? "USD") : null;
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
                                  <ImageWithSkeleton src={attraction.photoUrl} alt="" width={52} height={52} unoptimized className={styles.attractionThumbImg} />
                                </div>
                              )}
                              {(canEdit || token || attraction.websiteUrl) && (
                                <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
                                  <WebsiteLinkButton url={attraction.websiteUrl} variant="compact" />
                                  {token && attraction.attractionId && (
                                    <button
                                      type="button"
                                      className={`${styles.editBtn} ${attraction.isVisited ? styles.editBtnActive : ""}`}
                                      onClick={() => handleToggleVisited(attraction)}
                                      aria-label={attraction.isVisited ? `${attraction.name} marked as visited` : `Mark ${attraction.name} as visited`}
                                    >
                                      <Check size={14} aria-hidden="true" />
                                    </button>
                                  )}
                                  {canEdit && (
                                    <>
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
                                    </>
                                  )}
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

              </>
            )}
          </div>
        </div>
      </main>

      <AttractionSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        country={trip.country}
        onAdd={handleSearchAdd}
        onCreateNew={handleSearchCreateNew}
        token={token}
        existingAttractionIds={attractions.map((a) => a.attractionId ?? a._id)}
        multiSelect
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
        isVisited={viewingAttraction?.isVisited}
        onToggleVisited={
          token && viewingAttraction?.attractionId
            ? () => handleToggleVisited(viewingAttraction)
            : undefined
        }
      />

      {/* No existingAttractionIds here, deliberately: unlike regular attractions, re-picking the
          same residence for a second stay (different dates) within the same trip is legitimate —
          see the "duplicate attraction prevention" task, which scoped id-based "already added"
          blocking to regular attractions only. */}
      <AttractionSearchModal
        isOpen={residenceSearchOpen}
        onClose={() => setResidenceSearchOpen(false)}
        country={trip.country}
        onAdd={handleResidenceSearchPick}
        onCreateNew={handleResidenceSearchCreateNew}
        token={token}
        subtypeFilter="residence"
        title="Add Residence"
        createLabel="Add a new residence"
      />

      <AddResidenceModal
        isOpen={residenceModalOpen || !!editingResidence}
        onClose={() => { setResidenceModalOpen(false); setEditingResidence(null); setResidencePrefill(undefined); }}
        onSave={editingResidence ? handleResidenceUpdate : handleResidenceSave}
        tripCountry={trip.country}
        tripCity={trip.cities?.[0]}
        tripStartDate={trip.startDate}
        tripEndDate={trip.endDate}
        currency={trip.currency}
        initialData={residenceInitialData}
        prefill={residencePrefill}
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
