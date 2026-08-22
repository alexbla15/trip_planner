"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Globe, Plus, ChevronLeft, SlidersHorizontal, X, Ruler, Footprints, Car, Bus, Loader2, Search, Check, Map as MapIcon, LayoutGrid, ChevronRight, Luggage } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useAttractionTypes } from "@/hooks";
import {
  getCities, getAttractionsByCity, getAttractionsByCountry, createAttraction, updateAttraction,
  fetchRouteLeg, formatLegDuration, formatStepDuration,
  searchLocation, addAttractionToTrip,
  markAttractionVisited, unmarkAttractionVisited,
} from "@/services";
import type { TravelMode, RouteLeg } from "@/services";
import { AttractionDetailModal, NewAttractionModal, TripPickerModal, Spinner, FormErrorBanner, AttractionFilter, AttractionGridCard, attractionToFormData } from "@/components";
import type { AttractionFormData } from "@/components";
import type { Attraction } from "@/types/attraction";
import type { Trip } from "@/types/trip";
import { EXPLORE_GRID_CARD_MIN_WIDTH_PX, EXPLORE_GRID_GAP_PX, EXPLORE_GRID_ROWS_PER_PAGE } from "@/config/ui";
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
  /** How many of this city's attractions the requesting user has marked visited.
   *  0 for an anonymous/unauthenticated request. */
  visitedCount: number;
  unvisitedCount: number;
  /** How many of this city's attractions already appear in one of the requesting
   *  user's own trips. 0 for an anonymous/unauthenticated request. */
  usedInTripCount: number;
  notUsedInTripCount: number;
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
  const [countryAttractions, setCountryAttractions] = useState<Attraction[]>([]);
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

  // Map vs grid view — only meaningful in country/city view (world view has no
  // individual-attraction list, only aggregated city/country pins).
  const [viewMode, setViewMode]                   = useState<"map" | "grid">("map");
  const [gridPage, setGridPage]                   = useState(1);
  const [gridColumns, setGridColumns]             = useState(4);
  const gridRef = useRef<HTMLDivElement>(null);

  // Filters (only active in city view)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes]           = useState<string[]>([]);
  const [visitedFilter, setVisitedFilter]           = useState<"all" | "visited" | "unvisited">("all");
  const [tripUsageFilter, setTripUsageFilter]       = useState<"all" | "used" | "unused">("all");

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

  // Load cities on mount (re-fetches on auth change too — visitedCount/unvisitedCount
  // per city depend on who's asking).
  useEffect(() => {
    setCitiesLoading(true);
    setCitiesLoadError(false);
    getCities(token)
      .then((data) => setCities((data as { cities: CityEntry[] }).cities ?? []))
      .catch(() => setCitiesLoadError(true))
      .finally(() => setCitiesLoading(false));
  }, [citiesReloadKey, token]);

  // Load attractions when city changes
  useEffect(() => {
    if (!selectedCity) { setCityAttractions([]); return; }
    setAttractionsLoading(true);
    setPageError(null);
    getAttractionsByCity(selectedCity, token)
      .then((data) => setCityAttractions(Array.isArray(data) ? (data as Attraction[]) : []))
      .catch(() => setPageError("Couldn't load attractions for this city. Please try again."))
      .finally(() => setAttractionsLoading(false));
  }, [selectedCity, token]);

  // Load every attraction in the country when a country is selected but no city yet —
  // powers the country-view map's individual attraction pins (replacing the old
  // per-city pin/boundary breakdown). Skipped once a city is picked (city-scoped fetch
  // above takes over).
  useEffect(() => {
    if (!selectedCountry || selectedCity) { setCountryAttractions([]); return; }
    setAttractionsLoading(true);
    setPageError(null);
    getAttractionsByCountry(selectedCountry, token)
      .then((data) => setCountryAttractions(Array.isArray(data) ? (data as Attraction[]) : []))
      .catch(() => setPageError("Couldn't load attractions for this country. Please try again."))
      .finally(() => setAttractionsLoading(false));
  }, [selectedCountry, selectedCity, token]);

  // Cities matching the visited + trip-usage filters — a country/city only stays listed
  // if at least one of its attractions matches (e.g. "Unvisited" hides a city where every
  // attraction is already marked visited). Applies across the whole Explore experience
  // (world → country → city), driven by the single header picker, not just the selected
  // city's list.
  const visibleCities = useMemo(() => {
    return cities
      .filter((c) => visitedFilter === "all" || (visitedFilter === "visited" ? c.visitedCount > 0 : c.unvisitedCount > 0))
      .filter((c) => tripUsageFilter === "all" || (tripUsageFilter === "used" ? c.usedInTripCount > 0 : c.notUsedInTripCount > 0));
  }, [cities, visitedFilter, tripUsageFilter]);

  // The number to display for a city/country pill under whichever filter is active — the
  // total attraction count is misleading once filtered (e.g. showing "12" under "Unvisited"
  // when only 4 of those 12 are actually unvisited), so show whichever count matches what
  // drilling into that city would actually reveal. When both filters are active there's no
  // tracked intersection count, so the visited filter (checked first) takes priority — an
  // approximation, but still closer than the unfiltered total.
  function countFor(entry: { count: number; visitedCount: number; unvisitedCount: number; usedInTripCount: number; notUsedInTripCount: number }): number {
    if (visitedFilter !== "all") return visitedFilter === "visited" ? entry.visitedCount : entry.unvisitedCount;
    if (tripUsageFilter !== "all") return tripUsageFilter === "used" ? entry.usedInTripCount : entry.notUsedInTripCount;
    return entry.count;
  }

  // Derive unique countries with centroid + radius
  const countries = useMemo<CountryEntry[]>(() => {
    const map = new Map<string, { count: number; latSum: number; lngSum: number; cityList: CityEntry[] }>();
    for (const city of visibleCities) {
      const cityCount = countFor(city);
      const existing = map.get(city.country);
      if (existing) {
        existing.count += cityCount;
        existing.latSum += city.lat;
        existing.lngSum += city.lng;
        existing.cityList.push(city);
      } else {
        map.set(city.country, { count: cityCount, latSum: city.lat, lngSum: city.lng, cityList: [city] });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCities, visitedFilter, tripUsageFilter]);

  const citiesInCountry = useMemo(
    () => (selectedCountry ? visibleCities.filter((c) => c.country === selectedCountry) : []),
    [visibleCities, selectedCountry]
  );

  function passesVisitedFilter(a: Attraction): boolean {
    return visitedFilter === "all" || (visitedFilter === "visited" ? !!a.isVisited : !a.isVisited);
  }

  function passesTripUsageFilter(a: Attraction): boolean {
    const used = !!a.usedInTripNames && a.usedInTripNames.length > 0;
    return tripUsageFilter === "all" || (tripUsageFilter === "used" ? used : !used);
  }

  // Shared by both city- and country-scoped attraction lists: does this attraction match
  // the currently selected category/type chips? (Visited/trip-usage status is checked
  // separately via passesVisitedFilter/passesTripUsageFilter — independent filters
  // combined by each caller.)
  function matchesChipFilters(a: Attraction): boolean {
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
  }

  // Client-side filtering of city attractions
  const filteredAttractions = useMemo(() => {
    return cityAttractions.filter((a) => matchesChipFilters(a) && passesVisitedFilter(a) && passesTripUsageFilter(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityAttractions, selectedCategories, selectedTypes, visitedFilter, tripUsageFilter, byCategory]);

  // Country-view attraction pins — same category/type + visited/trip-usage filtering as
  // city view, so selecting a type in country view narrows the map pins too, not just a list.
  const filteredCountryAttractions = useMemo(() => {
    return countryAttractions.filter((a) => matchesChipFilters(a) && passesVisitedFilter(a) && passesTripUsageFilter(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryAttractions, selectedCategories, selectedTypes, visitedFilter, tripUsageFilter, byCategory]);

  // Grid view renders from the exact same filtered list the map's pins already use —
  // no separate fetch, no separate filter logic. Page size is however many cards
  // actually fit per row (measured) × a fixed number of rows, not a flat constant —
  // otherwise a wide viewport fits far more than one page's worth per row and paginates
  // after showing only a sliver of unused space.
  const gridAttractions = selectedCity ? filteredAttractions : filteredCountryAttractions;
  const gridPageSize = gridColumns * EXPLORE_GRID_ROWS_PER_PAGE;
  const gridTotalPages = Math.max(1, Math.ceil(gridAttractions.length / gridPageSize));
  const paginatedGridAttractions = gridAttractions.slice(
    (gridPage - 1) * gridPageSize, gridPage * gridPageSize
  );

  // Recompute how many columns the grid's own measured width actually fits, matching
  // the CSS `repeat(auto-fill, minmax(...))` math exactly (see EXPLORE_GRID_CARD_MIN_WIDTH_PX/
  // EXPLORE_GRID_GAP_PX doc comment) — re-measures on resize/browser-zoom via ResizeObserver.
  //
  // Changing the column count changes gridPageSize, which means "page 3" no longer refers
  // to the same slice of the list — keeping the same page NUMBER after a resize silently
  // jumps to a different (often already-seen) set of items, which is exactly what looked
  // like "the same attractions keep showing up" when zooming in/out mid-browse. Instead,
  // preserve the READING POSITION: recompute which page now contains the first item that
  // was visible before the resize, using the previous page size (tracked in a ref so the
  // ResizeObserver callback always compares against the size that was actually in effect,
  // not a stale closure value).
  const prevGridPageSizeRef = useRef(gridPageSize);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const compute = () => {
      // .gridArea has 20px horizontal padding on each side (see .gridArea in
      // ExploreClient.module.css) — subtract it so column math matches the actual
      // track width available to .grid, not the padded container's own width.
      const width = el.clientWidth - 40;
      const cols = Math.max(1, Math.floor(
        (width + EXPLORE_GRID_GAP_PX) / (EXPLORE_GRID_CARD_MIN_WIDTH_PX + EXPLORE_GRID_GAP_PX)
      ));
      const newPageSize = cols * EXPLORE_GRID_ROWS_PER_PAGE;
      const oldPageSize = prevGridPageSizeRef.current;
      if (newPageSize !== oldPageSize) {
        setGridPage((prevPage) => Math.floor(((prevPage - 1) * oldPageSize) / newPageSize) + 1);
        prevGridPageSizeRef.current = newPageSize;
      }
      setGridColumns(cols);
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(el);
    return () => observer.disconnect();
    // Only `viewMode` matters here — the grid container only exists in the DOM while
    // viewMode === "grid" (see the ref-attaching JSX below); `view` isn't referenced
    // to avoid depending on a value declared later in this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // Reset to page 1 whenever the underlying filtered set changes shape, so the user
  // never lands on a stale, now-out-of-range page after narrowing a filter.
  useEffect(() => { setGridPage(1); }, [selectedCountry, selectedCity, selectedCategories, selectedTypes, visitedFilter, tripUsageFilter]);

  // Safety clamp for cases the position-preserving resize logic above doesn't cover
  // (e.g. the filtered item count itself shrinks) — never a no-op relative to it since
  // a position-preserved page number is always within the new total already.
  useEffect(() => { setGridPage((p) => Math.min(p, gridTotalPages)); }, [gridTotalPages]);

  // Attractions matching only the visited/trip-usage filters, scoped to whichever level
  // is currently selected (country-wide once a country is picked, narrowed to the city
  // once one is picked) — the base set for computing which category/type chips are worth
  // showing, so e.g. "Unvisited" doesn't leave a category chip visible that would produce
  // zero results if also selected (every match already visited).
  const chipScopedAttractions = useMemo(() => {
    const pool = selectedCity ? cityAttractions : countryAttractions;
    return pool.filter((a) => passesVisitedFilter(a) && passesTripUsageFilter(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity, cityAttractions, countryAttractions, visitedFilter, tripUsageFilter]);

  // Categories present in the current scope (honoring the visited filter)
  const availableCategories = useMemo(() => {
    const typeNamesInScope = new Set(chipScopedAttractions.flatMap((a) => a.types ?? []));
    return categories.filter((cat) =>
      (byCategory[cat] ?? []).some((t) => typeNamesInScope.has(t.name))
    );
  }, [categories, byCategory, chipScopedAttractions]);

  // Types present in the current scope (honoring the visited filter), filtered by selected categories
  const availableTypes = useMemo(() => {
    const typeNamesInScope = new Set(chipScopedAttractions.flatMap((a) => a.types ?? []));
    return types.filter((t) => {
      const inScope = typeNamesInScope.has(t.name);
      const inCategory =
        selectedCategories.length === 0 ||
        selectedCategories.some((cat) =>
          (byCategory[cat] ?? []).some((bt) => bt.name === t.name)
        );
      return inScope && inCategory;
    });
  }, [types, byCategory, chipScopedAttractions, selectedCategories]);

  const hasActiveFilters = selectedCategories.length > 0 || selectedTypes.length > 0 || visitedFilter !== "all" || tripUsageFilter !== "all";
  const activeFilterCount = selectedCategories.length + selectedTypes.length + (visitedFilter !== "all" ? 1 : 0) + (tripUsageFilter !== "all" ? 1 : 0);

  // Note: visitedFilter is deliberately NOT reset by any of these — it's a page-level
  // filter (applies to which countries/cities are even listed, via visibleCities), not a
  // per-city one, so navigating world → country → city → back must preserve the user's
  // choice. Only selectedCategories/selectedTypes are city-specific and reset on navigation.
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

  // Dropping a category also drops any selected types that belong to it — a type chip
  // left selected under a removed category would otherwise keep filtering silently.
  function handleCategoriesChange(next: string[]) {
    const removed = selectedCategories.filter((c) => !next.includes(c));
    setSelectedCategories(next);
    if (removed.length > 0) {
      setSelectedTypes((prev) =>
        prev.filter((t) => {
          const parentCat = Object.entries(byCategory).find(([, ts]) =>
            ts.some((tp) => tp.name === t)
          )?.[0];
          return !parentCat || !removed.includes(parentCat);
        })
      );
    }
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
    // Country view renders from this separate array (fetched via getAttractionsByCountry),
    // not cityAttractions — without this, editing at the country level leaves the marker
    // showing stale data (e.g. the old photo) until the country/city is re-fetched.
    setCountryAttractions((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
    toast.success("Attraction updated");
  }

  // "Visited" is a per-user fact about the shared attraction document — flip it on
  // every row sharing the same real attraction id, plus the open detail modal if it's
  // currently showing this attraction, with an optimistic update + rollback on failure.
  // Keeps the separate `cities` aggregate (visitedCount/unvisitedCount, used to filter
  // which countries/cities are even listed) in sync with a toggle — without this, those
  // counts stay stale until the next full page load, so e.g. the last unvisited attraction
  // in a city gets marked visited but the city keeps appearing under "Unvisited".
  function adjustCityVisitedCount(cityName: string | undefined, country: string, delta: number) {
    if (!cityName) return;
    setCities((prev) =>
      prev.map((c) =>
        c.name === cityName && c.country === country
          ? { ...c, visitedCount: c.visitedCount + delta, unvisitedCount: c.unvisitedCount - delta }
          : c
      )
    );
  }

  async function handleToggleVisited(attraction: Attraction) {
    if (!token || !attraction.attractionId) return;
    const realId = attraction.attractionId;
    const next = !attraction.isVisited;

    setCityAttractions((prev) =>
      prev.map((a) => (a.attractionId ?? a._id) === realId ? { ...a, isVisited: next } : a)
    );
    // Country view renders from this separate array — without this, toggling visited
    // while a visited/unvisited filter is active at the country level leaves the map
    // pin showing (or hiding) stale data until a full re-fetch.
    setCountryAttractions((prev) =>
      prev.map((a) => (a.attractionId ?? a._id) === realId ? { ...a, isVisited: next } : a)
    );
    setSelectedAttraction((prev) =>
      prev && (prev.attractionId ?? prev._id) === realId ? { ...prev, isVisited: next } : prev
    );
    adjustCityVisitedCount(attraction.city, attraction.country, next ? 1 : -1);

    try {
      if (next) await markAttractionVisited(realId, token);
      else await unmarkAttractionVisited(realId, token);
    } catch {
      setCityAttractions((prev) =>
        prev.map((a) => (a.attractionId ?? a._id) === realId ? { ...a, isVisited: !next } : a)
      );
      setCountryAttractions((prev) =>
        prev.map((a) => (a.attractionId ?? a._id) === realId ? { ...a, isVisited: !next } : a)
      );
      setSelectedAttraction((prev) =>
        prev && (prev.attractionId ?? prev._id) === realId ? { ...prev, isVisited: !next } : prev
      );
      adjustCityVisitedCount(attraction.city, attraction.country, next ? -1 : 1);
      toast.error("Couldn't update visited status. Please try again.");
    }
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
    const realId = attractionForTripPicker.attractionId ?? attractionForTripPicker._id;
    setTripPickerOpen(false);
    try {
      await addAttractionToTrip(trip._id, token, { existingAttractionId: attractionForTripPicker._id });
      toast.success(`Added to ${trip.name}`);

      const appendTripName = (a: Attraction) =>
        (a.attractionId ?? a._id) === realId && !(a.usedInTripNames ?? []).includes(trip.name)
          ? { ...a, usedInTripNames: [...(a.usedInTripNames ?? []), trip.name] }
          : a;
      setCityAttractions((prev) => prev.map(appendTripName));
      setCountryAttractions((prev) => prev.map(appendTripName));
      setSelectedAttraction((prev) => (prev ? appendTripName(prev) : prev));
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
          <div className={styles.sidebarHeaderTop}>
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

          {/* Applies across the whole Explore experience (world/country/city), not just
              a single city's attraction list — visited status is personal to the
              logged-in user, hidden entirely for anonymous visitors. */}
          {user && (
            <div className={styles.chipGroup} role="radiogroup" aria-label="Filter by visited status">
              <button
                type="button"
                className={`${styles.chip} ${visitedFilter === "all" ? styles.chipActive : ""}`}
                role="radio"
                aria-checked={visitedFilter === "all"}
                onClick={() => setVisitedFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`${styles.chip} ${visitedFilter === "visited" ? styles.chipActive : ""}`}
                role="radio"
                aria-checked={visitedFilter === "visited"}
                onClick={() => setVisitedFilter("visited")}
              >
                <Check size={12} aria-hidden="true" />
                Visited
              </button>
              <button
                type="button"
                className={`${styles.chip} ${visitedFilter === "unvisited" ? styles.chipActive : ""}`}
                role="radio"
                aria-checked={visitedFilter === "unvisited"}
                onClick={() => setVisitedFilter("unvisited")}
              >
                <X size={12} aria-hidden="true" />
                Unvisited
              </button>
            </div>
          )}

          {/* Same scope/pattern as the visited-status filter above — "used in trip" is
              also a private per-user fact (Trip.attractionIds for the user's own trips),
              hidden entirely for anonymous visitors. */}
          {user && (
            <div className={styles.chipGroup} role="radiogroup" aria-label="Filter by trip usage">
              <button
                type="button"
                className={`${styles.chip} ${tripUsageFilter === "all" ? styles.chipActive : ""}`}
                role="radio"
                aria-checked={tripUsageFilter === "all"}
                onClick={() => setTripUsageFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`${styles.chip} ${tripUsageFilter === "used" ? styles.chipActive : ""}`}
                role="radio"
                aria-checked={tripUsageFilter === "used"}
                onClick={() => setTripUsageFilter("used")}
              >
                <Luggage size={12} aria-hidden="true" />
                In my trips
              </button>
              <button
                type="button"
                className={`${styles.chip} ${tripUsageFilter === "unused" ? styles.chipActive : ""}`}
                role="radio"
                aria-checked={tripUsageFilter === "unused"}
                onClick={() => setTripUsageFilter("unused")}
              >
                <X size={12} aria-hidden="true" />
                Not in my trips
              </button>
            </div>
          )}
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
              ) : !citiesLoading && countries.length === 0 && cities.length === 0 ? (
                <p className={styles.worldPrompt}>
                  No attractions have been added yet.
                  <br />
                  Be the first to add one!
                </p>
              ) : !citiesLoading && countries.length === 0 ? (
                <p className={styles.worldPrompt}>
                  No destinations match the selected filters.
                  <br />
                  Try a different one above.
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

              {countryAttractions.length > 0 && (
                <p className={styles.cityCount}>
                  {filteredCountryAttractions.length} of {countryAttractions.length} attraction
                  {countryAttractions.length !== 1 ? "s" : ""}
                </p>
              )}

              {(availableCategories.length > 0 || availableTypes.length > 0) && (
                <div className={styles.filterSection}>
                  <AttractionFilter
                    hideSearch
                    collapsible
                    categories={availableCategories}
                    selectedCategories={selectedCategories}
                    onCategoriesChange={handleCategoriesChange}
                    categoryLabel="Categories"
                    types={availableTypes}
                    selectedTypes={selectedTypes}
                    onTypesChange={setSelectedTypes}
                    typeLabel="Types"
                  />
                </div>
              )}

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
                    <span className={styles.cityPillCount}>{countFor(c)}</span>
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

              {(availableCategories.length > 0 || availableTypes.length > 0) && (
                <div className={styles.filterSection}>
                  <AttractionFilter
                    hideSearch
                    collapsible
                    categories={availableCategories}
                    selectedCategories={selectedCategories}
                    onCategoriesChange={handleCategoriesChange}
                    categoryLabel="Categories"
                    types={availableTypes}
                    selectedTypes={selectedTypes}
                    onTypesChange={setSelectedTypes}
                    typeLabel="Types"
                  />
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
        {(view === "world" || view === "country" || view === "city") && (
          <div className={styles.sidebarFooter}>
            {hasActiveFilters && (view === "city" || view === "country") && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => { setSelectedCategories([]); setSelectedTypes([]); setVisitedFilter("all"); setTripUsageFilter("all"); }}
              >
                Clear filters
              </button>
            )}
            {/* Available at every step (world/country/city) — the form reflects whichever
                of country/city is currently selected, editable rather than locked, since
                Explore isn't scoped to one destination the way a trip is. */}
            {user && (
              <button
                type="button"
                className={styles.addBtn}
                onClick={() => setAddModalOpen(true)}
              >
                <Plus size={16} aria-hidden="true" />
                Add Attraction
              </button>
            )}
            {(view === "country" || view === "city") && (
              <button
                type="button"
                className={`${styles.addBtn} ${measureMode ? styles.addBtnActive : ""}`}
                onClick={toggleMeasureMode}
                aria-pressed={measureMode}
              >
                {measureMode ? <X size={16} aria-hidden="true" /> : <Ruler size={16} aria-hidden="true" />}
                {measureMode ? "Exit measuring" : "Measure distance"}
              </button>
            )}
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

        {/* Map/grid toggle — only meaningful once individual attractions are loaded
            (country or city view); world view has no such list to switch layouts for. */}
        {(view === "country" || view === "city") && (
          <div className={styles.viewModeToggle} role="group" aria-label="Map or grid view">
            <button
              type="button"
              className={`${styles.viewModeBtn} ${viewMode === "map" ? styles.viewModeBtnActive : ""}`}
              onClick={() => setViewMode("map")}
              aria-pressed={viewMode === "map"}
            >
              <MapIcon size={14} aria-hidden="true" />
              Map
            </button>
            <button
              type="button"
              className={`${styles.viewModeBtn} ${viewMode === "grid" ? styles.viewModeBtnActive : ""}`}
              onClick={() => setViewMode("grid")}
              aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid size={14} aria-hidden="true" />
              Grid
            </button>
          </div>
        )}

        {viewMode === "map" || view === "world" ? (
          <ExploreMapWidget
            countries={countries}
            selectedCountry={selectedCountry}
            selectedCity={selectedCity}
            cities={cities}
            attractions={view === "country" ? filteredCountryAttractions : filteredAttractions}
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
        ) : (
          <div className={styles.gridArea} ref={gridRef}>
            {gridAttractions.length === 0 ? (
              <p className={styles.worldPrompt}>No attractions match the selected filters.</p>
            ) : (
              <>
                <div className={styles.grid}>
                  {paginatedGridAttractions.map((a) => (
                    <AttractionGridCard key={a._id} attraction={a} onClick={setSelectedAttraction} />
                  ))}
                </div>
                {gridTotalPages > 1 && (
                  <div className={styles.gridPagination}>
                    <button
                      type="button"
                      className={styles.paginationBtn}
                      onClick={() => setGridPage((p) => p - 1)}
                      disabled={gridPage === 1}
                      aria-label="Go to previous page"
                    >
                      <ChevronLeft size={14} aria-hidden="true" />
                    </button>
                    <span className={styles.paginationInfo}>Page {gridPage} of {gridTotalPages}</span>
                    <button
                      type="button"
                      className={styles.paginationBtn}
                      onClick={() => setGridPage((p) => p + 1)}
                      disabled={gridPage === gridTotalPages}
                      aria-label="Go to next page"
                    >
                      <ChevronRight size={14} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
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
        isVisited={selectedAttraction?.isVisited}
        onToggleVisited={
          token && selectedAttraction?.attractionId
            ? () => handleToggleVisited(selectedAttraction)
            : undefined
        }
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
          prefillCountry={selectedCountry ?? undefined}
          prefillCity={selectedCity ?? undefined}
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
