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
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { getIconComponent } from "@/lib/attractionIcons";
import { useAttractionTypes } from "@/hooks/useAttractionTypes";
import type { CityWithCoords } from "./AnalyticsCitiesMap";
import styles from "./AnalyticsClient.module.css";

const DynamicCountriesMap = dynamic(
  () => import("./AnalyticsCountriesMap").then((m) => ({ default: m.AnalyticsCountriesMap })),
  { ssr: false, loading: () => <div className={styles.mapLoading}>Loading map…</div> }
);

const DynamicCitiesMap = dynamic(
  () => import("./AnalyticsCitiesMap").then((m) => ({ default: m.AnalyticsCitiesMap })),
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
  topCities: Array<{ _id: string; count: number; country?: string; lat?: number; lng?: number }>;
}

interface DetailRow {
  name: string;
  count: number;
  href?: string;
  subtitle?: string;
}

// ── SVG donut helpers ──────────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlicePath(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startAngle: number, endAngle: number,
): string {
  // Guard: full circle would produce degenerate path
  const sweep = Math.min(endAngle - startAngle, 359.999);
  const end = startAngle + sweep;
  const os = polarToCartesian(cx, cy, outerR, startAngle);
  const oe = polarToCartesian(cx, cy, outerR, end);
  const ie = polarToCartesian(cx, cy, innerR, end);
  const is = polarToCartesian(cx, cy, innerR, startAngle);
  const large = sweep > 180 ? 1 : 0;
  return [
    `M ${os.x.toFixed(3)} ${os.y.toFixed(3)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${oe.x.toFixed(3)} ${oe.y.toFixed(3)}`,
    `L ${ie.x.toFixed(3)} ${ie.y.toFixed(3)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${is.x.toFixed(3)} ${is.y.toFixed(3)}`,
    `Z`,
  ].join(" ");
}

const SKELETON_ROWS = 5;
const CX = 110; const CY = 110;
const OUTER_R = 100; const INNER_R = 60;

// Tint a hex color toward white by mixing at the given opacity (0–1)
function tintColor(baseHex: string, opacity: number): string {
  const r = parseInt(baseHex.slice(1, 3), 16);
  const g = parseInt(baseHex.slice(3, 5), 16);
  const b = parseInt(baseHex.slice(5, 7), 16);
  const t = 1 - opacity;
  return `rgb(${Math.round(r + (255 - r) * t)}, ${Math.round(g + (255 - g) * t)}, ${Math.round(b + (255 - b) * t)})`;
}

export function AnalyticsClient() {
  const { byCategory, colorForCategory } = useAttractionTypes();
  const [data, setData] = useState<GlobalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hoveredIndex, setHoveredIndex]         = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeStat, setActiveStat]             = useState<string | null>(null);
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

  // Aggregate individual types into parent categories client-side
  const categoryAggregated = useMemo(() => {
    const map: Record<string, number> = {};
    for (const { _id, count } of rawTypes) {
      for (const [cat, catTypes] of Object.entries(byCategory)) {
        if (catTypes.some((t) => t.name === _id)) {
          map[cat] = (map[cat] ?? 0) + count;
          break;
        }
      }
    }
    return Object.entries(map)
      .map(([cat, count]) => ({ _id: cat, count }))
      .sort((a, b) => b.count - a.count);
  }, [rawTypes]);

  const categoryTotal = useMemo(
    () => categoryAggregated.reduce((s, c) => s + c.count, 0),
    [categoryAggregated],
  );

  // Pre-compute slice angles once
  const slices = useMemo(() => {
    let cum = 0;
    return categoryAggregated.map((cat, i) => {
      const pct = categoryTotal > 0 ? cat.count / categoryTotal : 0;
      const startAngle = cum;
      const endAngle = cum + pct * 360;
      cum = endAngle;
      const color = colorForCategory(cat._id) !== "#64748B" ? colorForCategory(cat._id) : `hsl(${(i * 47) % 360}, 70%, 80%)`;
      return { cat, i, startAngle, endAngle, color };
    });
  }, [categoryAggregated, categoryTotal]);

  // ── Stat card detail rows ────────────────────────────────────────────────
  const detailRows = useMemo((): DetailRow[] => {
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

  // ── Drill-down sub-chart ──────────────────────────────────────────────────
  const subChartTypes = useMemo(() => {
    if (!selectedCategory) return [];
    const catTypeNames = (byCategory[selectedCategory] ?? []).map((t) => t.name);
    return rawTypes
      .filter(({ _id, count }) => catTypeNames.includes(_id) && count > 0)
      .sort((a, b) => b.count - a.count);
  }, [selectedCategory, rawTypes]);

  const subChartTotal = useMemo(
    () => subChartTypes.reduce((s, t) => s + t.count, 0),
    [subChartTypes],
  );

  const subSlices = useMemo(() => {
    if (!selectedCategory || subChartTypes.length === 0) return [];
    const baseColor = colorForCategory(selectedCategory);
    let cum = 0;
    return subChartTypes.map(({ _id, count }, i) => {
      const pct = subChartTotal > 0 ? count / subChartTotal : 0;
      const startAngle = cum;
      const endAngle   = cum + pct * 360;
      cum = endAngle;
      const opacity = 1.0 - (i / Math.max(subChartTypes.length - 1, 1)) * 0.65;
      return { _id, count, i, startAngle, endAngle, color: tintColor(baseColor, opacity) };
    });
  }, [selectedCategory, subChartTypes, subChartTotal]);

  function handleSliceClick(catName: string) {
    setSelectedCategory((prev) => (prev === catName ? null : catName));
  }

  // ── Geo map flags ─────────────────────────────────────────────────────────
  const showCountriesMap = activeStat === "Countries" && !loading && !!data;
  const showCitiesMap    = activeStat === "Cities Covered" && !loading && !!data;

  // Countries that have at least one city with coordinates, for the filter dropdown
  const cityCountryOptions = useMemo(() => {
    if (!showCitiesMap) return [];
    const set = new Set<string>();
    for (const c of data!.topCities ?? []) {
      if (c.country && c.lat != null && c.lng != null) set.add(c.country);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [showCitiesMap, data]);

  const mappedCities: CityWithCoords[] = useMemo(() => {
    if (!showCitiesMap) return [];
    const withCoords = (data!.topCities ?? []).filter(
      (c): c is CityWithCoords => c.lat != null && c.lng != null
    );
    const filtered = cityCountryFilter === "all"
      ? withCoords
      : withCoords.filter((c) => c.country === cityCountryFilter);
    return filtered.slice(0, 20);
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
        {loading ? (
          <div className={styles.statsGrid} aria-busy="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.statCard} aria-hidden="true">
                <div className={`${styles.skeletonCircle} ${styles.shimmer}`} />
                <div className={`${styles.skeletonNumber} ${styles.shimmer}`} />
                <div className={`${styles.skeletonLabel} ${styles.shimmer}`} />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.statsGrid}>
            {[
              { icon: MapPinned, label: "Total Trips",       value: data!.summary.totalTrips },
              { icon: Landmark,  label: "Total Attractions", value: data!.summary.totalAttractions },
              { icon: Users,     label: "Users",             value: data!.summary.totalUsers },
              { icon: Globe,     label: "Countries",         value: data!.summary.uniqueCountriesCovered },
              { icon: Building2, label: "Cities Covered",    value: data!.summary.uniqueCitiesCovered },
            ].map(({ icon: Icon, label, value }) => {
              const isActive = activeStat === label;
              return (
                <button
                  key={label}
                  type="button"
                  className={`${styles.statCard} ${isActive ? styles.statCardActive : ""}`}
                  onClick={() => selectStat(label)}
                  aria-expanded={isActive}
                  aria-controls="stat-detail-panel"
                >
                  <div className={styles.statIconCircle}>
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <span className={styles.statValue}>{value.toLocaleString()}</span>
                  <span className={styles.statLabel}>{label}</span>
                </button>
              );
            })}
          </div>
        )}

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

            {/* Country filter — Cities map only */}
            {showCitiesMap && cityCountryOptions.length > 0 && (
              <div className={styles.citySelectWrapper}>
                <select
                  value={cityCountryFilter}
                  onChange={(e) => setCityCountryFilter(e.target.value)}
                  className={styles.citySelect}
                  aria-label="Filter cities by country"
                >
                  <option value="all">All countries</option>
                  {cityCountryOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown size={14} className={styles.citySelectIcon} aria-hidden="true" />
              </div>
            )}

            {/* Geographic map — Countries or Cities */}
            {(showCountriesMap || (showCitiesMap && mappedCities.length > 0)) && (
              <div className={styles.analyticsMapContainer}>
                {showCountriesMap && <DynamicCountriesMap countries={data!.topCountries} />}
                {showCitiesMap && mappedCities.length > 0 && (
                  <DynamicCitiesMap cities={mappedCities} />
                )}
              </div>
            )}

            {showCitiesMap && mappedCities.length === 0 && (
              <p className={styles.mapEmptyNote}>No cities with coordinates for this selection.</p>
            )}

            {/* Ranked list — hidden for Countries (map is sufficient) */}
            {!showCountriesMap && detailRows.length > 0 && (
              <ol className={styles.detailList}>
                {detailRows.map(({ name, count, href, subtitle }, i) => (
                  <li key={`${name}-${i}`} className={styles.detailRow}>
                    <span className={styles.detailRank}>{i + 1}</span>
                    <span className={styles.detailNameCol}>
                      {href ? (
                        <Link href={href} className={styles.detailLink}>{name}</Link>
                      ) : (
                        <span className={styles.detailName}>{name}</span>
                      )}
                      {subtitle && (
                        <span className={styles.detailSubtitle}>{subtitle}</span>
                      )}
                    </span>
                    <span className={styles.detailCount}>{count.toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {/* ── Attraction Types Pie Chart ── */}
        <div className={styles.card}>
          <div className={styles.sectionHeadingRow}>
            <div className={styles.sectionIconCircle}>
              <BarChart2 size={18} aria-hidden="true" />
            </div>
            <h2 className={styles.sectionHeading}>Attractions by Category</h2>
          </div>

          {loading ? (
            <div className={styles.pieSkeleton} aria-hidden="true">
              <div className={`${styles.skeletonPieCircle} ${styles.shimmer}`} />
              <div className={styles.skeletonLegend}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={styles.skeletonLegendRow}>
                    <div className={`${styles.skeletonDot} ${styles.shimmer}`} />
                    <div className={`${styles.skeletonLegendText} ${styles.shimmer}`} />
                  </div>
                ))}
              </div>
            </div>
          ) : categoryAggregated.length === 0 ? (
            <p className={styles.sectionEmpty}>No category data yet.</p>
          ) : (
            <div className={styles.pieSection}>
              {/* ── Main chart ── */}
              <div className={styles.mainChart}>
                <svg
                  viewBox="0 0 220 220"
                  width="220"
                  height="220"
                  className={styles.pieSvg}
                  aria-label="Attraction categories donut chart"
                  role="img"
                >
                  {slices.map(({ cat, i, startAngle, endAngle, color }) => (
                    <path
                      key={cat._id}
                      d={donutSlicePath(CX, CY, OUTER_R, INNER_R, startAngle, endAngle)}
                      fill={color}
                      stroke="white"
                      strokeWidth="2"
                      className={[
                        hoveredIndex === i ? styles.sliceHovered : styles.slice,
                        selectedCategory === cat._id ? styles.sliceSelected : "",
                      ].filter(Boolean).join(" ")}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onClick={() => handleSliceClick(cat._id)}
                      aria-label={`${cat._id}: ${cat.count}${selectedCategory === cat._id ? " (selected)" : ""}`}
                    />
                  ))}
                </svg>

                <ul className={styles.pieLegend} aria-label="Category breakdown">
                  {slices.map(({ cat, i, color }) => {
                    const pct = categoryTotal > 0
                      ? ((cat.count / categoryTotal) * 100).toFixed(1)
                      : "0";
                    const catIconName = byCategory[cat._id]?.[0]?.categoryIcon ?? "Globe";
                    const CatIcon = getIconComponent(catIconName);
                    const isHovered    = hoveredIndex === i;
                    const isSelected   = selectedCategory === cat._id;
                    return (
                      <li
                        key={cat._id}
                        className={[
                          styles.legendItem,
                          isHovered  ? styles.legendItemHovered  : "",
                          isSelected ? styles.legendItemSelected : "",
                        ].filter(Boolean).join(" ")}
                        tabIndex={0}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={() => handleSliceClick(cat._id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSliceClick(cat._id);
                          }
                        }}
                      >
                        <span
                          className={styles.legendDot}
                          style={{ ["--dot-color" as string]: color }}
                        />
                        {CatIcon && (
                          <span className={styles.legendIcon} aria-hidden="true">
                            <CatIcon size={12} />
                          </span>
                        )}
                        <span className={styles.legendName}>{cat._id}</span>
                        <span className={styles.legendCount}>{cat.count.toLocaleString()}</span>
                        <span className={styles.legendPct}>{pct}%</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* ── Sub-chart (drill-down) ── */}
              {selectedCategory && subSlices.length > 0 && (
                <div
                  className={styles.subChart}
                  aria-live="polite"
                  aria-label={`${selectedCategory} breakdown`}
                >
                  <p className={styles.subChartTitle}>{selectedCategory}</p>
                  <div className={styles.subChartBody}>
                    <svg
                      viewBox="0 0 220 220"
                      width="220"
                      height="220"
                      className={styles.pieSvg}
                      aria-label={`${selectedCategory} type breakdown`}
                      role="img"
                    >
                      {subSlices.map(({ _id, count, startAngle, endAngle, color }) => (
                        <path
                          key={_id}
                          d={donutSlicePath(CX, CY, OUTER_R, INNER_R, startAngle, endAngle)}
                          fill={color}
                          stroke="white"
                          strokeWidth="2"
                          className={styles.slice}
                          aria-label={`${_id}: ${count}`}
                        />
                      ))}
                    </svg>
                    <ul className={styles.subLegend} aria-label={`${selectedCategory} types`}>
                      {subSlices.map(({ _id, count, color }) => {
                        const pct = subChartTotal > 0
                          ? ((count / subChartTotal) * 100).toFixed(1)
                          : "0";
                        return (
                          <li key={_id} className={styles.subLegendItem}>
                            <span
                              className={styles.legendDot}
                              style={{ ["--dot-color" as string]: color }}
                            />
                            <span className={styles.legendName}>{_id}</span>
                            <span className={styles.legendCount}>{count.toLocaleString()}</span>
                            <span className={styles.legendPct}>{pct}%</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Top Explorers ── */}
        <div className={styles.card}>
          <div className={styles.sectionHeadingRow}>
            <div className={styles.sectionIconCircle}>
              <Trophy size={18} aria-hidden="true" />
            </div>
            <h2 className={styles.sectionHeading}>Top Explorers</h2>
          </div>

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
        </div>
      </div>
    </main>
  );
}
