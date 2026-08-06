"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Globe, Plus, ChevronLeft, SlidersHorizontal, X, Ruler, Footprints, Car, Bus, Loader2, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useAttractionTypes } from "@/hooks";
import {
  getCities, getAttractionsByCity, createAttraction, updateAttraction,
  fetchRouteLeg, formatLegDuration, formatStepDuration,
  searchLocation, addAttractionToTrip,
} from "@/services";
import type { TravelMode, RouteLeg } from "@/services";
import { AttractionDetailModal, NewAttractionModal, TripPickerModal, Spinner, FormErrorBanner } from "@/components";
import type { AttractionFormData, OpeningHours, DurationUnit } from "@/components";
import { DEFAULT_OPENING_HOURS } from "@/components";
import type { Attraction } from "@/types/attraction";
import type { Trip } from "@/types/trip";
import styles from "./ExploreClient.module.css";

interface LocationSearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

export type MeasurePoint =
  | { kind: "attraction"; attraction: Attraction }
  | { kind: "custom"; lat: number; lng: number };

function measurePointCoord(p: MeasurePoint): { lat: number; lng: number } | null {
  return p.kind === "attraction" ? p.attraction.coordinates ?? null : { lat: p.lat, lng: p.lng };
}

function measurePointLabel(p: MeasurePoint): string {
  return p.kind === "attraction" ? p.attraction.name : "Dropped pin";
}

// Mirrors TripDetailClient.tsx's attractionToFormData — kept local since it's a small,
// self-contained mapping and this is currently the only other caller.
function attractionToFormData(a: Attraction): AttractionFormData {
  return {
    name: a.name,
    country: a.country,
    city: a.city ?? "",
    coordinates: a.coordinates ?? null,
    types: (a.types ?? []) as AttractionFormData["types"],
    durationValue: a.durationValue ?? "",
    durationUnit: (a.durationUnit ?? "hours") as DurationUnit,
    price: a.price ?? null,
    currency: a.currency ?? "USD",
    openingHours: (a.openingHours as OpeningHours | undefined)?.Mon
      ? (a.openingHours as OpeningHours)
      : structuredClone(DEFAULT_OPENING_HOURS),
    notes: a.notes ?? "",
    photoUrl: a.photoUrl ?? "",
  };
}

const ExploreMapWidget = dynamic(
  () => import("./ExploreMapWidget").then((m) => ({ default: m.ExploreMapWidget })),
  {
    ssr: false,
    loading: () => <Spinner centered />,
  }
);

export interface CityEntry {
  name: string;
  country: string;
  lat: number;
  lng: number;
  count: number;
}

export interface CountryEntry {
  name: string;
  lat: number;
  lng: number;
  count: number;
  radius: number; // metres — based on max city spread, min 150 km
}

export type MapHandle = {
  flyToCity: (lat: number, lng: number) => void;
  flyToCountry: (lat: number, lng: number) => void;
  flyToWorld: () => void;
};

export function ExploreClient() {
  const { user, token } = useAuth();
  const toast = useToast();
  const { types, categories, byCategory } = useAttractionTypes();

  // Data
  const [cities, setCities]                       = useState<CityEntry[]>([]);
  const [cityAttractions, setCityAttractions]     = useState<Attraction[]>([]);
  const [citiesLoading, setCitiesLoading]         = useState(true);
  const [citiesLoadError, setCitiesLoadError]     = useState(false);
  const [citiesReloadKey, setCitiesReloadKey]     = useState(0);
  const [attractionsLoading, setAttractionsLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  // View state — 3 levels: world → country → city
  const [selectedCountry, setSelectedCountry]     = useState<string | null>(null);
  const [selectedCity, setSelectedCity]           = useState<string | null>(null);
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);
  const [editingAttraction, setEditingAttraction] = useState<Attraction | null>(null);
  const [addModalOpen, setAddModalOpen]           = useState(false);
  const [pinToAttractionCoords, setPinToAttractionCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [tripPickerOpen, setTripPickerOpen] = useState(false);
  const [attractionForTripPicker, setAttractionForTripPicker] = useState<Attraction | null>(null);
  const [sidebarOpen, setSidebarOpen]             = useState(false);

  // Filters (only active in city view)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes]           = useState<string[]>([]);

  // Measure-distance tool (available once a country is selected — see view guard below)
  const [measureMode, setMeasureMode]               = useState(false);
  const [measurePoints, setMeasurePoints]           = useState<MeasurePoint[]>([]);
  const [measureLegMode, setMeasureLegMode]         = useState<TravelMode>("walk");
  const [measureRoute, setMeasureRoute]             = useState<RouteLeg | null>(null);
  const [measureRouteLoading, setMeasureRouteLoading] = useState(false);

  // Measure-tool location search — same debounced Nominatim search + suggestions
  // pattern as NewAttractionModal's LeafletMapWidget.tsx, so pins can be placed by
  // searching a place name, not only by clicking the map.
  const [measureSearchQuery, setMeasureSearchQuery]           = useState("");
  const [measureSearchSuggestions, setMeasureSearchSuggestions] = useState<LocationSearchResult[]>([]);
  const [measureSearching, setMeasureSearching]               = useState(false);
  const measureSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapRef = useRef<MapHandle | null>(null);

  // Fetch the route between the two selected measure points whenever either the
  // points or the travel mode change — mirrors TripDayMapWidget.tsx's leg-fetch effect.
  useEffect(() => {
    if (measurePoints.length !== 2) { setMeasureRoute(null); return; }
    const from = measurePointCoord(measurePoints[0]);
    const to   = measurePointCoord(measurePoints[1]);
    if (!from || !to) { setMeasureRoute(null); return; }

    let cancelled = false;
    setMeasureRouteLoading(true);
    fetchRouteLeg(from, to, measureLegMode)
      .then((leg) => { if (!cancelled) setMeasureRoute(leg); })
      .finally(() => { if (!cancelled) setMeasureRouteLoading(false); });
    return () => { cancelled = true; };
  }, [measurePoints, measureLegMode]);

  // Load cities on mount
  useEffect(() => {
    setCitiesLoading(true);
    setCitiesLoadError(false);
    getCities()
      .then((data) => setCities((data as { cities: CityEntry[] }).cities ?? []))
      .catch(() => setCitiesLoadError(true))
      .finally(() => setCitiesLoading(false));
  }, [citiesReloadKey]);

  // Load attractions when city changes
  useEffect(() => {
    if (!selectedCity) { setCityAttractions([]); return; }
    setAttractionsLoading(true);
    setPageError(null);
    getAttractionsByCity(selectedCity)
      .then((data) => setCityAttractions(Array.isArray(data) ? (data as Attraction[]) : []))
      .catch(() => setPageError("Couldn't load attractions for this city. Please try again."))
      .finally(() => setAttractionsLoading(false));
  }, [selectedCity]);

  // Derive unique countries with centroid + radius
  const countries = useMemo<CountryEntry[]>(() => {
    const map = new Map<string, { count: number; latSum: number; lngSum: number; cityList: CityEntry[] }>();
    for (const city of cities) {
      const existing = map.get(city.country);
      if (existing) {
        existing.count += city.count;
        existing.latSum += city.lat;
        existing.lngSum += city.lng;
        existing.cityList.push(city);
      } else {
        map.set(city.country, { count: city.count, latSum: city.lat, lngSum: city.lng, cityList: [city] });
      }
    }
    return [...map.entries()]
      .map(([name, d]) => {
        const numCities = d.cityList.length;
        const lat = d.latSum / numCities;
        const lng = d.lngSum / numCities;
        // Radius = max distance from centroid to any city × 1.4, minimum 150 km
        const maxDist = d.cityList.reduce((mx, c) => {
          const dlat = (c.lat - lat) * 111_000;
          const dlng = (c.lng - lng) * 111_000 * Math.cos((lat * Math.PI) / 180);
          return Math.max(mx, Math.sqrt(dlat * dlat + dlng * dlng));
        }, 0);
        return { name, lat, lng, count: d.count, radius: Math.max(150_000, maxDist * 1.4) };
      })
      .sort((a, b) => b.count - a.count);
  }, [cities]);

  const citiesInCountry = useMemo(
    () => (selectedCountry ? cities.filter((c) => c.country === selectedCountry) : []),
    [cities, selectedCountry]
  );

  // Client-side filtering of city attractions
  const filteredAttractions = useMemo(() => {
    return cityAttractions.filter((a) => {
      const typeNames = a.types ?? [];
      const passCategory =
        selectedCategories.length === 0 ||
        typeNames.some((t) => {
          const cat = Object.entries(byCategory).find(([, ts]) =>
            ts.some((tp) => tp.name === t)
          )?.[0];
          return cat && selectedCategories.includes(cat);
        });
      const passType =
        selectedTypes.length === 0 || typeNames.some((t) => selectedTypes.includes(t));
      return passCategory && passType;
    });
  }, [cityAttractions, selectedCategories, selectedTypes, byCategory]);

  // Categories present in the current city
  const availableCategories = useMemo(() => {
    const typeNamesInCity = new Set(cityAttractions.flatMap((a) => a.types ?? []));
    return categories.filter((cat) =>
      (byCategory[cat] ?? []).some((t) => typeNamesInCity.has(t.name))
    );
  }, [categories, byCategory, cityAttractions]);

  // Types present in the current city, filtered by selected categories
  const availableTypes = useMemo(() => {
    const typeNamesInCity = new Set(cityAttractions.flatMap((a) => a.types ?? []));
    return types.filter((t) => {
      const inCity = typeNamesInCity.has(t.name);
      const inCategory =
        selectedCategories.length === 0 ||
        selectedCategories.some((cat) =>
          (byCategory[cat] ?? []).some((bt) => bt.name === t.name)
        );
      return inCity && inCategory;
    });
  }, [types, byCategory, cityAttractions, selectedCategories]);

  const hasActiveFilters = selectedCategories.length > 0 || selectedTypes.length > 0;
  const activeFilterCount = selectedCategories.length + selectedTypes.length;

  const handleCountrySelect = useCallback(
    (country: CountryEntry) => {
      setSelectedCountry(country.name);
      setSelectedCity(null);
      setCityAttractions([]);
      setSelectedCategories([]);
      setSelectedTypes([]);
      setSidebarOpen(false);
      mapRef.current?.flyToCountry(country.lat, country.lng);
    },
    []
  );

  const handleCitySelect = useCallback((city: CityEntry) => {
    setSelectedCity(city.name);
    setSelectedCategories([]);
    setSelectedTypes([]);
    setSidebarOpen(false);
    mapRef.current?.flyToCity(city.lat, city.lng);
  }, []);

  const handleBackToCountry = useCallback(() => {
    setSelectedCity(null);
    setCityAttractions([]);
    setSelectedCategories([]);
    setSelectedTypes([]);
    const country = countries.find((c) => c.name === selectedCountry);
    if (country) mapRef.current?.flyToCountry(country.lat, country.lng);
  }, [countries, selectedCountry]);

  const handleBackToWorld = useCallback(() => {
    setSelectedCountry(null);
    setSelectedCity(null);
    setCityAttractions([]);
    setSelectedCategories([]);
    setSelectedTypes([]);
    mapRef.current?.flyToWorld();
  }, []);

  function toggleCategory(cat: string) {
    const isRemoving = selectedCategories.includes(cat);
    setSelectedCategories((prev) =>
      isRemoving ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    if (isRemoving) {
      setSelectedTypes((prev) =>
        prev.filter((t) => {
          const parentCat = Object.entries(byCategory).find(([, ts]) =>
            ts.some((tp) => tp.name === t)
          )?.[0];
          return parentCat !== cat;
        })
      );
    }
  }

  function toggleType(typeName: string) {
    setSelectedTypes((prev) =>
      prev.includes(typeName) ? prev.filter((t) => t !== typeName) : [...prev, typeName]
    );
  }

  async function handleAddSave(data: AttractionFormData) {
    if (!token) return;
    let newAttraction: Attraction;
    setPageError(null);
    try {
      newAttraction = (await createAttraction(token, data)) as Attraction;
    } catch {
      setPageError("Couldn't save the attraction. Please try again.");
      return;
    }
    setAddModalOpen(false);
    if (selectedCity && newAttraction.city === selectedCity) {
      setCityAttractions((prev) => [...prev, newAttraction]);
    }
  }

  async function handleEditSave(data: AttractionFormData) {
    if (!token || !editingAttraction) return;
    const id = editingAttraction._id;
    setPageError(null);
    let updated: Attraction;
    try {
      updated = (await updateAttraction(id, token, data)) as Attraction;
    } catch {
      setPageError("Couldn't update the attraction. Please try again.");
      return;
    }
    setEditingAttraction(null);
    setSelectedAttraction(null);
    setCityAttractions((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
    toast.success("Attraction updated");
  }

  function toggleMeasureMode() {
    setMeasureMode((prev) => {
      const next = !prev;
      if (!next) {
        setMeasurePoints([]);
        setMeasureRoute(null);
        setMeasureSearchQuery("");
        setMeasureSearchSuggestions([]);
      }
      return next;
    });
  }

  function addMeasurePoint(point: MeasurePoint) {
    // Once 2 points are set, a new selection replaces the oldest (FIFO) so the tool
    // stays ready for the next comparison without an explicit "clear" step.
    setMeasurePoints((prev) => (prev.length < 2 ? [...prev, point] : [prev[1], point]));
  }

  function handleMeasureMapClick(lat: number, lng: number) {
    addMeasurePoint({ kind: "custom", lat, lng });
  }

  function handleCustomPinClick(lat: number, lng: number) {
    setPinToAttractionCoords({ lat, lng });
  }

  async function handlePinAttractionSave(data: AttractionFormData) {
    if (!token || !pinToAttractionCoords) return;
    const { lat, lng } = pinToAttractionCoords;
    let newAttraction: Attraction;
    setPageError(null);
    try {
      newAttraction = (await createAttraction(token, data)) as Attraction;
    } catch {
      setPageError("Couldn't save the attraction. Please try again.");
      return;
    }
    setPinToAttractionCoords(null);
    // The dropped pin's job is done — drop it from the measure tool now that it's a
    // real saved attraction, rather than leaving a stale duplicate-looking pin behind.
    setMeasurePoints((prev) => prev.filter((p) => !(p.kind === "custom" && p.lat === lat && p.lng === lng)));
    if (selectedCity && newAttraction.city === selectedCity) {
      setCityAttractions((prev) => [...prev, newAttraction]);
    }
    toast.success("Attraction saved");
  }

  async function handleTripSelect(trip: Trip) {
    if (!token || !attractionForTripPicker) return;
    setTripPickerOpen(false);
    try {
      await addAttractionToTrip(trip._id, token, { existingAttractionId: attractionForTripPicker._id });
      toast.success(`Added to ${trip.name}`);
    } catch {
      toast.error(`Couldn't add to ${trip.name}. Please try again.`);
    }
  }

  function handleMeasureSearchChange(val: string) {
    setMeasureSearchQuery(val);
    if (measureSearchDebounceRef.current) clearTimeout(measureSearchDebounceRef.current);
    if (!val.trim()) { setMeasureSearchSuggestions([]); return; }
    measureSearchDebounceRef.current = setTimeout(async () => {
      setMeasureSearching(true);
      try {
        setMeasureSearchSuggestions((await searchLocation(val)) as LocationSearchResult[]);
      } catch {
        setMeasureSearchSuggestions([]);
      } finally {
        setMeasureSearching(false);
      }
    }, 400);
  }

  function handleMeasureSearchSelect(result: LocationSearchResult) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    addMeasurePoint({ kind: "custom", lat, lng });
    mapRef.current?.flyToCity(lat, lng);
    setMeasureSearchQuery(result.display_name.split(",").slice(0, 2).join(", ").trim());
    setMeasureSearchSuggestions([]);
  }

  function handleMeasureAttractionSelect(attraction: Attraction) {
    setMeasurePoints((prev) => {
      const idx = prev.findIndex((p) => p.kind === "attraction" && p.attraction._id === attraction._id);
      if (idx !== -1) return prev.filter((_, i) => i !== idx);
      return prev.length < 2 ? [...prev, { kind: "attraction", attraction }] : [prev[1], { kind: "attraction", attraction }];
    });
  }

  function handleAttractionMarkerClick(attraction: Attraction) {
    if (measureMode) handleMeasureAttractionSelect(attraction);
    else setSelectedAttraction(attraction);
  }

  // Current view level
  const view = selectedCity ? "city" : selectedCountry ? "country" : "world";

  return (
    <div className={styles.page}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className={styles.backdrop}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile bar — in document flow, always reachable regardless of Leaflet z-index */}
      <div className={styles.mobileBar}>
        <span className={styles.mobileBarLabel}>
          {view === "city"
            ? (selectedCity ?? "")
            : view === "country"
            ? (selectedCountry ?? "")
            : "Explore"}
        </span>
        <button
          type="button"
          className={styles.mobileBarBtn}
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={`${sidebarOpen ? "Close" : "Open"} panel${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}`}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen
            ? <X size={18} aria-hidden="true" />
            : <SlidersHorizontal size={18} aria-hidden="true" />}
          {activeFilterCount > 0 && !sidebarOpen && (
            <span className={styles.filterBadge} aria-hidden="true">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Sidebar ── */}
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}
        aria-label="Explore filters"
      >
        <div className={styles.sidebarHeader}>
          <h1 className={styles.sidebarTitle}>
            <Globe size={18} className={styles.sidebarTitleIcon} aria-hidden="true" />
            Explore
          </h1>
          <button
            type="button"
            className={styles.sidebarClose}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close filters"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* ── Scrollable content area ── */}
        <div className={styles.sidebarScrollArea}>
          <FormErrorBanner message={pageError} />

          {/* World view */}
          {view === "world" && (
            <>
              {!citiesLoading && citiesLoadError ? (
                <>
                  <p className={styles.worldPrompt}>
                    Couldn&apos;t load destinations. Please try again.
                  </p>
                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={() => setCitiesReloadKey((k) => k + 1)}
                  >
                    Try again
                  </button>
                </>
              ) : !citiesLoading && countries.length === 0 ? (
                <p className={styles.worldPrompt}>
                  No attractions have been added yet.
                  <br />
                  Be the first to add one!
                </p>
              ) : (
                <p className={styles.worldPrompt}>
                  Choose a country from the map or list below to see available cities.
                </p>
              )}
              {!citiesLoading && countries.length > 0 && (
                <div className={styles.cityList}>
                  <span className={styles.cityListLabel}>Countries</span>
                  {countries.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      className={styles.cityPill}
                      onClick={() => handleCountrySelect(c)}
                    >
                      {c.name}
                      <span className={styles.cityPillCount}>{c.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Country view */}
          {view === "country" && (
            <>
              <button type="button" className={styles.backBtn} onClick={handleBackToWorld}>
                <ChevronLeft size={15} aria-hidden="true" />
                World view
              </button>
              <h2 className={styles.cityHeading}>{selectedCountry}</h2>
              <p className={styles.cityCount}>
                {citiesInCountry.length} cit{citiesInCountry.length !== 1 ? "ies" : "y"}
              </p>
              <div className={styles.cityList}>
                <span className={styles.cityListLabel}>Cities</span>
                {citiesInCountry.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className={styles.cityPill}
                    onClick={() => handleCitySelect(c)}
                  >
                    {c.name}
                    <span className={styles.cityPillCount}>{c.count}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* City view — scrollable content only (footer is below, outside scroll) */}
          {view === "city" && (
            <>
              <button type="button" className={styles.backBtn} onClick={handleBackToCountry}>
                <ChevronLeft size={15} aria-hidden="true" />
                {selectedCountry}
              </button>
              <h2 className={styles.cityHeading}>{selectedCity}</h2>
              <p className={styles.cityCount}>
                {filteredAttractions.length} of {cityAttractions.length} attraction
                {cityAttractions.length !== 1 ? "s" : ""}
              </p>

              {availableCategories.length > 0 && (
                <div className={styles.filterSection}>
                  <span className={styles.filterLabel}>Categories</span>
                  <div className={styles.chipGroup} role="group" aria-label="Filter by category">
                    {availableCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`${styles.chip} ${selectedCategories.includes(cat) ? styles.chipActive : ""}`}
                        aria-pressed={selectedCategories.includes(cat)}
                        onClick={() => toggleCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {availableTypes.length > 0 && (
                <div className={styles.filterSection}>
                  <span className={styles.filterLabel}>Types</span>
                  <div className={styles.chipGroup} role="group" aria-label="Filter by type">
                    {availableTypes.map((t) => (
                      <button
                        key={t.name}
                        type="button"
                        className={`${styles.chip} ${selectedTypes.includes(t.name) ? styles.chipActive : ""}`}
                        aria-pressed={selectedTypes.includes(t.name)}
                        onClick={() => toggleType(t.name)}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredAttractions.length === 0 && cityAttractions.length > 0 && (
                <p className={styles.worldPrompt}>No attractions match the selected filters.</p>
              )}
            </>
          )}
        </div>

        {/* ── Measure-distance panel: shown once a country is selected, either view ── */}
        {(view === "country" || view === "city") && measureMode && (
          <div className={styles.measurePanel}>
            <div className={styles.measureSearchWrapper}>
              <Search size={14} aria-hidden="true" className={styles.measureSearchIcon} />
              <input
                type="text"
                value={measureSearchQuery}
                onChange={(e) => handleMeasureSearchChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setMeasureSearchSuggestions([]); }}
                placeholder="Search for a location to drop a pin…"
                className={styles.measureSearchInput}
                aria-label="Search for a location"
                aria-autocomplete="list"
                aria-expanded={measureSearchSuggestions.length > 0}
                autoComplete="off"
              />
              {measureSearching && <span className={styles.measureSearchSpinner} aria-label="Searching…" />}
              {measureSearchSuggestions.length > 0 && (
                <ul className={styles.measureSuggestions} role="listbox" aria-label="Location suggestions">
                  {measureSearchSuggestions.map((r, i) => (
                    <li key={i} role="option" aria-selected={false}>
                      <button
                        type="button"
                        className={styles.measureSuggestionItem}
                        onClick={() => handleMeasureSearchSelect(r)}
                      >
                        {r.display_name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className={styles.measureHint} aria-live="polite">
              {measurePoints.length === 0
                ? "Click the map, search a location, or pick an attraction to pick your first point."
                : measurePoints.length === 1
                ? "Pick a second point — another attraction, a search result, or click the map."
                : null}
            </p>
            {measurePoints.length === 2 && (
              <div className={styles.legRow}>
                <div className={styles.legHeader}>
                  <span className={styles.legName}>
                    {measurePointLabel(measurePoints[0])} → {measurePointLabel(measurePoints[1])}
                  </span>
                  <div className={styles.legRight}>
                    <div className={styles.modeGroup} role="group" aria-label="Travel mode">
                      <button type="button"
                        className={`${styles.modeBtn} ${measureLegMode === "walk" ? styles.modeBtnActive : ""}`}
                        onClick={() => setMeasureLegMode("walk")}
                        aria-pressed={measureLegMode === "walk"} aria-label="Walk">
                        <Footprints size={14} aria-hidden="true" />
                      </button>
                      <button type="button"
                        className={`${styles.modeBtn} ${measureLegMode === "car" ? styles.modeBtnActive : ""}`}
                        onClick={() => setMeasureLegMode("car")}
                        aria-pressed={measureLegMode === "car"} aria-label="Drive">
                        <Car size={14} aria-hidden="true" />
                      </button>
                      <button type="button"
                        className={`${styles.modeBtn} ${measureLegMode === "transit" ? styles.modeBtnActive : ""}`}
                        onClick={() => setMeasureLegMode("transit")}
                        aria-pressed={measureLegMode === "transit"} aria-label="Public transport">
                        <Bus size={14} aria-hidden="true" />
                      </button>
                    </div>
                    <span className={styles.legTime}>
                      {measureRouteLoading
                        ? <Loader2 size={12} className={styles.legSpinner} aria-label="Loading route…" />
                        : measureRoute ? formatLegDuration(measureRoute) : "—"}
                    </span>
                  </div>
                </div>
                {/* Step breakdown — transit only; walk/car always return one redundant
                    step that just repeats the duration already shown above */}
                {measureLegMode === "transit" && measureRoute && measureRoute.steps.length > 0 && (
                  <ol className={styles.stepList}>
                    {measureRoute.steps.map((step, si) => (
                      <li key={si} className={styles.stepItem}>
                        <span className={styles.stepIcon} aria-hidden="true">
                          {step.icon === "walk"    ? <Footprints size={11} /> :
                           step.icon === "transit" ? <Bus size={11} />        :
                                                     <Car size={11} />}
                        </span>
                        {step.badge && (
                          <span className={styles.stepBadge} aria-label={`Line ${step.badge}`}>
                            {step.badge}
                          </span>
                        )}
                        <span className={styles.stepLabel}>{step.label}</span>
                        <span className={styles.stepTime}>{formatStepDuration(step.durationSec)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Footer: pinned at the bottom outside scroll ── */}
        {(view === "country" || view === "city") && (
          <div className={styles.sidebarFooter}>
            {hasActiveFilters && view === "city" && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => { setSelectedCategories([]); setSelectedTypes([]); }}
              >
                Clear filters
              </button>
            )}
            {user && view === "city" && (
              <button
                type="button"
                className={styles.addBtn}
                onClick={() => setAddModalOpen(true)}
              >
                <Plus size={16} aria-hidden="true" />
                Add Attraction
              </button>
            )}
            <button
              type="button"
              className={`${styles.addBtn} ${measureMode ? styles.addBtnActive : ""}`}
              onClick={toggleMeasureMode}
              aria-pressed={measureMode}
            >
              {measureMode ? <X size={16} aria-hidden="true" /> : <Ruler size={16} aria-hidden="true" />}
              {measureMode ? "Exit measuring" : "Measure distance"}
            </button>
          </div>
        )}
      </aside>

      {/* ── Map area ── */}
      <div className={styles.mapArea}>
        {attractionsLoading && (
          <div className={styles.mapLoadingOverlay} aria-live="polite" aria-label="Loading attractions">
            <Spinner />
          </div>
        )}

        <ExploreMapWidget
          countries={countries}
          citiesInCountry={citiesInCountry}
          selectedCountry={selectedCountry}
          selectedCity={selectedCity}
          cities={cities}
          attractions={filteredAttractions}
          onCountryClick={handleCountrySelect}
          onCityClick={handleCitySelect}
          onAttractionClick={handleAttractionMarkerClick}
          mapRef={mapRef}
          measureMode={measureMode}
          measurePoints={measurePoints}
          measureLegMode={measureLegMode}
          measureRoute={measureRoute}
          onMeasureMapClick={handleMeasureMapClick}
          onCustomPinClick={handleCustomPinClick}
        />
      </div>

      <AttractionDetailModal
        attraction={selectedAttraction}
        onClose={() => setSelectedAttraction(null)}
        canEdit={!!user && selectedAttraction?.ownerId === user._id}
        onEdit={() => setEditingAttraction(selectedAttraction)}
        onAddToTrip={user ? () => {
          setAttractionForTripPicker(selectedAttraction);
          setTripPickerOpen(true);
        } : undefined}
      />

      <TripPickerModal
        isOpen={tripPickerOpen}
        onClose={() => setTripPickerOpen(false)}
        onSelect={handleTripSelect}
        token={token}
        country={attractionForTripPicker?.country ?? ""}
      />

      {addModalOpen && (
        <NewAttractionModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onSave={handleAddSave}
        />
      )}

      {editingAttraction && (
        <NewAttractionModal
          isOpen={!!editingAttraction}
          initialData={attractionToFormData(editingAttraction)}
          onClose={() => setEditingAttraction(null)}
          onSave={handleEditSave}
        />
      )}

      {pinToAttractionCoords && (
        <NewAttractionModal
          isOpen={!!pinToAttractionCoords}
          initialCoordinates={pinToAttractionCoords}
          onClose={() => setPinToAttractionCoords(null)}
          onSave={handlePinAttractionSave}
        />
      )}
    </div>
  );
}
