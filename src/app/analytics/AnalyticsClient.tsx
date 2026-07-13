"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  BarChart2,
  MapPinned,
  Landmark,
  Building2,
  Globe,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  CategoryDonutChart,
  SectionCard,
  StatCardsGrid,
  RankedList,
  CountryFilterSelect,
} from "@/components";
import type { CityEntry, RankedListItem } from "@/components";
import styles from "./AnalyticsClient.module.css";

const DynamicCountriesMap = dynamic(
  () => import("@/components/CountriesMap/CountriesMap").then((m) => ({ default: m.CountriesMap })),
  { ssr: false, loading: () => <div className={styles.mapLoading}>Loading map…</div> }
);

const DynamicCitiesMap = dynamic(
  () => import("@/components/CitiesMap/CitiesMap").then((m) => ({ default: m.CitiesMap })),
  { ssr: false, loading: () => <div className={styles.mapLoading}>Loading map…</div> }
);

interface GlobalAnalytics {
  summary: {
    totalTrips: number;
    totalAttractions: number;
    totalUsers: number;
    uniqueCitiesCovered: number;
    uniqueCountriesCovered: number;
    totalPlatformBudget: number;
  };
  categoryDistribution: Array<{ _id: string; count: number }>;
  topUsers: Array<{ ownerId: string; name: string; attractionsCount: number; countriesCount: number }>;
  topTrips: Array<{ name: string; ownerId: string; attractionCount: number; tripId: string }>;
  topCountries: Array<{ _id: string; count: number }>;
  topCities: CityEntry[];
}

const SKELETON_ROWS = 5;

export function AnalyticsClient() {
  const [data, setData] = useState<GlobalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeStat, setActiveStat] = useState<string | null>(null);
  const [cityCountryFilter, setCityCountryFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/analytics/global")
      .then((r) => r.json())
      .then((d: GlobalAnalytics) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  function selectStat(label: string) {
    setActiveStat((prev) => (prev === label ? null : label));
    setCityCountryFilter("all");
  }

  const rawTypes = data?.categoryDistribution ?? [];

  const detailRows = useMemo((): RankedListItem[] => {
    if (!activeStat || !data) return [];
    switch (activeStat) {
      case "Total Trips":
        return (data.topTrips ?? []).map((t) => ({
          name: t.name,
          count: t.attractionCount,
          href: `/trips/${t.tripId}`,
        }));
      case "Total Attractions":
        return rawTypes.slice(0, 10).map((t) => ({ name: t._id, count: t.count }));
      case "Users":
        return data.topUsers.map((u) => ({ name: u.name, count: u.attractionsCount }));
      case "Countries":
        return (data.topCountries ?? []).map((c) => ({ name: c._id || "Unknown", count: c.count }));
      case "Cities Covered":
        return (data.topCities ?? [])
          .filter((c) => cityCountryFilter === "all" || c.country === cityCountryFilter)
          .slice(0, 10)
          .map((c) => ({
            name: c._id || "Unknown",
            count: c.count,
            subtitle: c.country,
          }));
      default:
        return [];
    }
  }, [activeStat, data, rawTypes, cityCountryFilter]);

  const showCountriesMap = activeStat === "Countries" && !loading && !!data;
  const showCitiesMap    = activeStat === "Cities Covered" && !loading && !!data;

  const cityCountryOptions = useMemo(() => {
    if (!showCitiesMap) return [];
    const set = new Set<string>();
    for (const c of data!.topCities ?? []) {
      if (c.country && c.lat != null && c.lng != null) set.add(c.country);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [showCitiesMap, data]);

  const mappedCities: CityEntry[] = useMemo(() => {
    if (!showCitiesMap) return [];
    const withCoords = (data!.topCities ?? []).filter(
      (c): c is CityEntry => c.lat != null && c.lng != null
    );
    return cityCountryFilter === "all"
      ? withCoords.slice(0, 20)
      : withCoords.filter((c) => c.country === cityCountryFilter).slice(0, 20);
  }, [showCitiesMap, data, cityCountryFilter]);

  if (!loading && (error || !data)) {
    return (
      <main className={styles.page}>
        <div className={styles.heroSection}>
          <div className={styles.heroInner}>
            <h1 className={styles.heroTitle}>Platform Analytics</h1>
          </div>
        </div>
        <div className={styles.content}>
          <div className={styles.emptyState}>
            <BarChart2 size={48} className={styles.emptyIcon} aria-hidden="true" />
            <p className={styles.emptyText}>Analytics data not available yet.</p>
          </div>
        </div>
      </main>
    );
  }

  const statItems = !loading && data ? [
    { icon: MapPinned, label: "Total Trips",       value: data.summary.totalTrips },
    { icon: Landmark,  label: "Total Attractions", value: data.summary.totalAttractions },
    { icon: Users,     label: "Users",             value: data.summary.totalUsers },
    { icon: Globe,     label: "Countries",         value: data.summary.uniqueCountriesCovered },
    { icon: Building2, label: "Cities Covered",    value: data.summary.uniqueCitiesCovered },
  ] : [];

  return (
    <main className={styles.page}>
      {/* Hero */}
      <div className={styles.heroSection}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Platform Analytics</h1>
          <p className={styles.heroSubtitle}>
            Real-time platform activity across all TripPlanner users.
          </p>
          <span className={styles.publicBadge}>
            <Globe size={13} aria-hidden="true" />
            Public · No login required
          </span>
        </div>
      </div>

      <div className={styles.content}>
        {/* ── Stat cards ── */}
        <StatCardsGrid
          items={statItems}
          loading={loading}
          skeletonCount={5}
          activeStat={activeStat}
          onStatClick={selectStat}
          panelId="stat-detail-panel"
        />

        {/* ── Stat detail panel ── */}
        {activeStat && !loading &&
          (showCountriesMap || (showCitiesMap && mappedCities.length > 0) || detailRows.length > 0) && (
          <div
            id="stat-detail-panel"
            className={`${styles.card} ${styles.detailPanel}`}
            role="region"
            aria-label={`${activeStat} details`}
          >
            <p className={styles.detailPanelHeading}>{activeStat}</p>

            {showCitiesMap && cityCountryOptions.length > 0 && (
              <CountryFilterSelect
                value={cityCountryFilter}
                options={cityCountryOptions}
                onChange={setCityCountryFilter}
              />
            )}

            {(showCountriesMap || (showCitiesMap && mappedCities.length > 0)) && (
              <div className={styles.analyticsMapContainer}>
                {showCountriesMap && <DynamicCountriesMap countries={data!.topCountries} />}
                {showCitiesMap && mappedCities.length > 0 && (
                  <DynamicCitiesMap
                    cities={mappedCities}
                    selectedCountry={cityCountryFilter !== "all" ? cityCountryFilter : undefined}
                  />
                )}
              </div>
            )}

            {showCitiesMap && mappedCities.length === 0 && (
              <p className={styles.mapEmptyNote}>No cities with coordinates for this selection.</p>
            )}

            {!showCountriesMap && detailRows.length > 0 && (
              <RankedList items={detailRows} />
            )}
          </div>
        )}

        {/* ── Attraction Types Pie Chart ── */}
        <SectionCard icon={BarChart2} title="Attractions by Category">
          <CategoryDonutChart rawTypes={rawTypes} loading={loading} />
        </SectionCard>

        {/* ── Top Explorers ── */}
        <SectionCard icon={Trophy} title="Top Explorers">
          {loading ? (
            <div aria-hidden="true">
              {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <div key={i} className={styles.tableSkeletonRow}>
                  <div className={`${styles.skeletonCell} ${styles.shimmer}`} />
                  <div className={`${styles.skeletonCell} ${styles.shimmer}`} />
                  <div className={`${styles.skeletonCellSmall} ${styles.shimmer}`} />
                  <div className={`${styles.skeletonCellSmall} ${styles.shimmer}`} />
                </div>
              ))}
            </div>
          ) : data!.topUsers.length === 0 ? (
            <p className={styles.sectionEmpty}>No explorer data yet.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col" className={styles.th}>#</th>
                    <th scope="col" className={styles.th}>Explorer</th>
                    <th scope="col" className={`${styles.th} ${styles.thRight}`}>Attractions</th>
                    <th scope="col" className={`${styles.th} ${styles.thRight}`}>Cities</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.topUsers.map((u, i) => (
                    <tr key={u.ownerId} className={`${styles.row} ${i === 0 ? styles.rowGold : ""}`}>
                      <td className={styles.rankCell}>
                        {i === 0 ? (
                          <span className={styles.goldRank}>
                            <Trophy size={14} aria-hidden="true" />1
                          </span>
                        ) : (
                          i + 1
                        )}
                      </td>
                      <td className={styles.explorerCell}>{u.name}</td>
                      <td className={styles.numCell}>{u.attractionsCount.toLocaleString()}</td>
                      <td className={styles.numCell}>{u.countriesCount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}
