"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Globe, Plus, ChevronLeft, SlidersHorizontal, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAttractionTypes } from "@/hooks/useAttractionTypes";
import { AttractionDetailModal } from "@/components/AttractionDetailModal/AttractionDetailModal";
import { NewAttractionModal } from "@/components/NewAttractionModal/NewAttractionModal";
import type { Attraction } from "@/types/attraction";
import type { AttractionFormData } from "@/components/NewAttractionModal/attraction.types";
import styles from "./ExploreClient.module.css";

const ExploreMapWidget = dynamic(
  () => import("./ExploreMapWidget").then((m) => ({ default: m.ExploreMapWidget })),
  {
    ssr: false,
    loading: () => <div className={`${styles.spinner} ${styles.spinnerCentered}`} />,
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
  const { types, categories, byCategory } = useAttractionTypes();

  // Data
  const [cities, setCities]                       = useState<CityEntry[]>([]);
  const [cityAttractions, setCityAttractions]     = useState<Attraction[]>([]);
  const [citiesLoading, setCitiesLoading]         = useState(true);
  const [attractionsLoading, setAttractionsLoading] = useState(false);

  // View state — 3 levels: world → country → city
  const [selectedCountry, setSelectedCountry]     = useState<string | null>(null);
  const [selectedCity, setSelectedCity]           = useState<string | null>(null);
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);
  const [addModalOpen, setAddModalOpen]           = useState(false);
  const [sidebarOpen, setSidebarOpen]             = useState(false);

  // Filters (only active in city view)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes]           = useState<string[]>([]);

  const mapRef = useRef<MapHandle | null>(null);

  // Load cities on mount
  useEffect(() => {
    setCitiesLoading(true);
    fetch("/api/attractions/cities")
      .then((r) => r.json())
      .then((data: { cities: CityEntry[] }) => setCities(data.cities ?? []))
      .catch(() => {})
      .finally(() => setCitiesLoading(false));
  }, []);

  // Load attractions when city changes
  useEffect(() => {
    if (!selectedCity) { setCityAttractions([]); return; }
    setAttractionsLoading(true);
    fetch(`/api/attractions?city=${encodeURIComponent(selectedCity)}`)
      .then((r) => r.json())
      .then((data: Attraction[]) => setCityAttractions(Array.isArray(data) ? data : []))
      .catch(() => {})
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
    const res = await fetch("/api/attractions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) return;
    const newAttraction = (await res.json()) as Attraction;
    setAddModalOpen(false);
    if (selectedCity && newAttraction.city === selectedCity) {
      setCityAttractions((prev) => [...prev, newAttraction]);
    }
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
          {/* World view */}
          {view === "world" && (
            <>
              {!citiesLoading && countries.length === 0 ? (
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

        {/* ── Footer: pinned at the bottom outside scroll, city view only ── */}
        {view === "city" && (
          <div className={styles.sidebarFooter}>
            {hasActiveFilters && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => { setSelectedCategories([]); setSelectedTypes([]); }}
              >
                Clear filters
              </button>
            )}
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
          </div>
        )}
      </aside>

      {/* ── Map area ── */}
      <div className={styles.mapArea}>
        {attractionsLoading && (
          <div className={styles.mapLoadingOverlay} aria-live="polite" aria-label="Loading attractions">
            <div className={styles.spinner} />
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
          onAttractionClick={setSelectedAttraction}
          mapRef={mapRef}
        />
      </div>

      <AttractionDetailModal
        attraction={selectedAttraction}
        onClose={() => setSelectedAttraction(null)}
      />

      {addModalOpen && (
        <NewAttractionModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onSave={handleAddSave}
        />
      )}
    </div>
  );
}
