"use client";

import { useState } from "react";
import { Compass, MapPin, Loader2, Check, Plus, AlertCircle, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { renderTypeIcon } from "@/components/IconPicker";
import { AttractionFilter } from "@/components/AttractionFilter";
import { ModalShell } from "@/components/Modal";
import { useAttractionTypes } from "@/hooks";
import { addAttractionToTrip, getAttractionsByCountry, formatStepDuration } from "@/services";
import { ATTRACTIONS_PAGE_SIZE } from "@/config/ui";
import type { Attraction } from "@/types/attraction";
import type { NearbyAttractionsModalProps, NearbySuggestion, NearbyStep } from "./NearbyAttractionsModal.types";
import { prefilterCandidates, findNearbySuggestions, formatMaxMinutesLabel } from "./NearbyAttractionsModal.utils";
import { DEFAULT_MAX_MINUTES, MAX_MINUTES_PRESETS } from "./NearbyAttractionsModal.constants";
import styles from "./NearbyAttractionsModal.module.css";

const HEADING_ID = "nearby-attractions-modal-title";

export function NearbyAttractionsModal({
  isOpen, onClose, tripId, tripAttractions, token, onAttractionAdded, onViewAttraction,
}: NearbyAttractionsModalProps) {
  const { findType } = useAttractionTypes();

  const [step, setStep]           = useState<NearbyStep>("pick");
  const [origin, setOrigin]       = useState<Attraction | null>(null);
  const [maxMinutes, setMaxMinutes] = useState(DEFAULT_MAX_MINUTES);

  const [loading, setLoading]     = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<NearbySuggestion[]>([]);
  const [failedCount, setFailedCount] = useState(0);
  const [addedIds, setAddedIds]   = useState<Set<string>>(new Set());
  const [addingId, setAddingId]   = useState<string | null>(null);

  const [resultCategories, setResultCategories] = useState<string[]>([]);
  const [resultTypes, setResultTypes]           = useState<string[]>([]);
  const [resultSearch, setResultSearch]         = useState("");
  const [resultPage, setResultPage]             = useState(1);

  const [originSearch, setOriginSearch] = useState("");
  const [originPage, setOriginPage]     = useState(1);

  const pickableOrigins = tripAttractions.filter((a) => !!a.coordinates);
  const filteredOrigins = pickableOrigins.filter((a) =>
    !originSearch.trim() || a.name.toLowerCase().includes(originSearch.trim().toLowerCase())
  );
  const originTotalPages = Math.max(1, Math.ceil(filteredOrigins.length / ATTRACTIONS_PAGE_SIZE));
  const paginatedOrigins = filteredOrigins.slice(
    (originPage - 1) * ATTRACTIONS_PAGE_SIZE, originPage * ATTRACTIONS_PAGE_SIZE
  );

  function handleClose() {
    onClose();
    // Reset for next open — after the close animation/unmount, so no visible flicker.
    setStep("pick");
    setOrigin(null);
    setMaxMinutes(DEFAULT_MAX_MINUTES);
    setSuggestions([]);
    setFailedCount(0);
    setAddedIds(new Set());
    setLoadError(null);
    setResultCategories([]);
    setResultTypes([]);
    setResultSearch("");
    setResultPage(1);
    setOriginSearch("");
    setOriginPage(1);
  }

  async function runSearch(originAttraction: Attraction, minutes: number) {
    if (!originAttraction.country || !originAttraction.coordinates) return;
    setLoading(true);
    setLoadError(null);
    try {
      const candidates = (await getAttractionsByCountry(originAttraction.country, token)) as Attraction[];
      const excludeIds = new Set(tripAttractions.map((a) => a.attractionId ?? a._id));
      const shortlist = prefilterCandidates(originAttraction, candidates, excludeIds, minutes);
      const { suggestions: results, failedCount: failed } = await findNearbySuggestions(originAttraction, shortlist, minutes);
      setSuggestions(results);
      setFailedCount(failed);
    } catch {
      setLoadError("Couldn't load nearby attractions. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePickOrigin(a: Attraction) {
    setOrigin(a);
    setStep("results");
    await runSearch(a, maxMinutes);
  }

  async function handleMaxMinutesChange(minutes: number) {
    setMaxMinutes(minutes);
    setResultPage(1);
    if (origin) await runSearch(origin, minutes);
  }

  async function handleAdd(a: Attraction) {
    const id = a.attractionId ?? a._id;
    setAddingId(id);
    try {
      const created = (await addAttractionToTrip(tripId, token, {
        existingAttractionId: id,
      })) as Attraction;
      onAttractionAdded(created);
      setAddedIds((prev) => new Set(prev).add(id));
    } catch {
      setLoadError("Couldn't add that attraction. Please try again.");
    } finally {
      setAddingId(null);
    }
  }

  const presentCategories = [...new Set(
    suggestions.flatMap((s) => s.attraction.types.map((t) => findType(t)?.category).filter((c): c is string => Boolean(c)))
  )];
  const presentTypeNames = new Set(suggestions.flatMap((s) => s.attraction.types));
  const presentTypes = Array.from(presentTypeNames)
    .map((name) => findType(name))
    .filter((t): t is NonNullable<typeof t> => !!t);

  const filteredSuggestions = suggestions.filter(({ attraction: a }) => {
    const q = resultSearch.trim().toLowerCase();
    const matchesText = !q || a.name.toLowerCase().includes(q);
    const matchesCategory =
      resultCategories.length === 0 ||
      a.types.some((t) => { const cat = findType(t)?.category; return cat && resultCategories.includes(cat); });
    const matchesType = resultTypes.length === 0 || a.types.some((t) => resultTypes.includes(t));
    return matchesText && matchesCategory && matchesType;
  });
  const resultTotalPages = Math.max(1, Math.ceil(filteredSuggestions.length / ATTRACTIONS_PAGE_SIZE));
  const paginatedSuggestions = filteredSuggestions.slice(
    (resultPage - 1) * ATTRACTIONS_PAGE_SIZE, resultPage * ATTRACTIONS_PAGE_SIZE
  );

  function handleResultCategoriesChange(next: string[]) {
    const removed = resultCategories.filter((c) => !next.includes(c));
    setResultCategories(next);
    setResultPage(1);
    if (removed.length > 0) {
      setResultTypes((prev) => prev.filter((t) => {
        const cat = findType(t)?.category;
        return !cat || !removed.includes(cat);
      }));
    }
  }

  function handleResultTypesChange(next: string[]) {
    setResultTypes(next);
    setResultPage(1);
  }

  function handleResultSearchChange(next: string) {
    setResultSearch(next);
    setResultPage(1);
  }

  function handleOriginSearchChange(next: string) {
    setOriginSearch(next);
    setOriginPage(1);
  }

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      styles={styles}
      headingId={HEADING_ID}
      header={
        <h2 id={HEADING_ID} className={styles.title}>
          <Compass size={18} aria-hidden="true" className={styles.titleIcon} />
          {step === "pick" ? "Discover Nearby" : `Near ${origin?.name}`}
        </h2>
      }
    >
      {step === "pick" && (
        <div className={styles.field}>
          <p className={styles.helperText}>Pick one of this trip&apos;s attractions to find nearby places.</p>
          {pickableOrigins.length === 0 ? (
            <p className={styles.emptyText}>No attractions with a location yet — add one first.</p>
          ) : (
            <>
              <div className={styles.searchRow}>
                <Search size={14} aria-hidden="true" className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search attractions…"
                  value={originSearch}
                  onChange={(e) => handleOriginSearchChange(e.target.value)}
                  aria-label="Search this trip's attractions"
                />
              </div>

              {filteredOrigins.length === 0 ? (
                <p className={styles.emptyText}>No attractions match &quot;{originSearch}&quot;.</p>
              ) : (
                <>
                  <ul className={styles.originList}>
                    {paginatedOrigins.map((a) => (
                      <li key={a._id}>
                        <button type="button" className={styles.originRow} onClick={() => handlePickOrigin(a)}>
                          <MapPin size={14} aria-hidden="true" className={styles.originIcon} />
                          <span className={styles.originName}>{a.name}</span>
                          {a.city && <span className={styles.originCity}>{a.city}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>

                  {originTotalPages > 1 && (
                    <div className={styles.pagination}>
                      <button
                        type="button"
                        className={styles.paginationBtn}
                        onClick={() => setOriginPage((p) => p - 1)}
                        disabled={originPage === 1}
                        aria-label="Go to previous page"
                      >
                        <ChevronLeft size={14} aria-hidden="true" />
                      </button>
                      <span className={styles.paginationInfo}>Page {originPage} of {originTotalPages}</span>
                      <button
                        type="button"
                        className={styles.paginationBtn}
                        onClick={() => setOriginPage((p) => p + 1)}
                        disabled={originPage === originTotalPages}
                        aria-label="Go to next page"
                      >
                        <ChevronRight size={14} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {step === "results" && (
        <>
          <button type="button" className={styles.backBtn} onClick={() => setStep("pick")}>
            <ChevronLeft size={14} aria-hidden="true" />
            Choose a different attraction
          </button>

          <div className={styles.field}>
            <span className={styles.labelWithIcon}>Max drive time</span>
            <div className={styles.minutesPresets}>
              {MAX_MINUTES_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`${styles.minutesChip} ${maxMinutes === m ? styles.minutesChipActive : ""}`}
                  onClick={() => handleMaxMinutesChange(m)}
                >
                  {formatMaxMinutesLabel(m)}
                </button>
              ))}
            </div>
          </div>

          <AttractionFilter
            searchValue={resultSearch}
            onSearchChange={handleResultSearchChange}
            searchLabel="Search nearby attractions"
            placeholder="Search attractions…"
            collapsible
            categories={presentCategories}
            selectedCategories={resultCategories}
            onCategoriesChange={handleResultCategoriesChange}
            categoryLabel="Categories"
            types={presentTypes}
            selectedTypes={resultTypes}
            onTypesChange={handleResultTypesChange}
            typeLabel="Types"
          />

          {loading && (
            <div className={styles.loadingState}>
              <Loader2 size={20} className={styles.spinner} aria-hidden="true" />
              <span>Finding nearby attractions…</span>
            </div>
          )}

          {!loading && loadError && (
            <p className={styles.errorMsg} role="alert">
              <AlertCircle size={12} aria-hidden="true" />{loadError}
            </p>
          )}

          {/* Distinct from loadError: the search itself succeeded, but some candidates
              couldn't be routed (e.g. the routing service rate-limited a burst of
              requests) — say so rather than letting a partial/failed batch read as
              "there's genuinely nothing nearby." */}
          {!loading && !loadError && failedCount > 0 && (
            <p className={styles.warningMsg} role="status">
              <AlertCircle size={12} aria-hidden="true" />
              Couldn&apos;t check {failedCount} nearby place{failedCount !== 1 ? "s" : ""} (routing service busy) — try again in a moment for a fuller list.
            </p>
          )}

          {!loading && !loadError && filteredSuggestions.length === 0 && (
            <p className={styles.emptyText}>No attractions found within {formatMaxMinutesLabel(maxMinutes)} of {origin?.name}.</p>
          )}

          {!loading && !loadError && filteredSuggestions.length > 0 && (
            <>
              <ul className={styles.resultList}>
                {paginatedSuggestions.map(({ attraction: a, durationSec }) => {
                  const id = a.attractionId ?? a._id;
                  const isAdded = addedIds.has(id);
                  const icon = renderTypeIcon(findType(a.types?.[0] ?? "")?.icon ?? "");
                  return (
                    <li key={id} className={styles.resultRow}>
                      <button
                        type="button"
                        className={styles.resultInfoBtn}
                        onClick={() => onViewAttraction?.(a)}
                        disabled={!onViewAttraction}
                        aria-label={`View details for ${a.name}`}
                      >
                        <span className={styles.resultIcon} aria-hidden="true">{icon}</span>
                        <div className={styles.resultInfo}>
                          <span className={styles.resultName}>{a.name}</span>
                          <span className={styles.resultMeta}>
                            {formatStepDuration(durationSec)} drive
                            {a.city ? ` · ${a.city}` : ""}
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`${styles.addBtn} ${isAdded ? styles.addBtnDone : ""}`}
                        disabled={isAdded || addingId === id}
                        onClick={() => handleAdd(a)}
                        aria-label={isAdded ? `${a.name} added to trip` : `Add ${a.name} to trip`}
                      >
                        {isAdded ? (
                          <><Check size={14} aria-hidden="true" />Added</>
                        ) : addingId === id ? (
                          <Loader2 size={14} className={styles.spinner} aria-hidden="true" />
                        ) : (
                          <><Plus size={14} aria-hidden="true" />Add</>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {resultTotalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    type="button"
                    className={styles.paginationBtn}
                    onClick={() => setResultPage((p) => p - 1)}
                    disabled={resultPage === 1}
                    aria-label="Go to previous page"
                  >
                    <ChevronLeft size={14} aria-hidden="true" />
                  </button>
                  <span className={styles.paginationInfo}>Page {resultPage} of {resultTotalPages}</span>
                  <button
                    type="button"
                    className={styles.paginationBtn}
                    onClick={() => setResultPage((p) => p + 1)}
                    disabled={resultPage === resultTotalPages}
                    aria-label="Go to next page"
                  >
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </ModalShell>
  );
}
