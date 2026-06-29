"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart2,
  MapPinned,
  Landmark,
  Building2,
  Globe,
  Trophy,
  Users,
} from "lucide-react";
import { ICONS } from "@/components/NewAttractionModal/AttractionTypeChip";
import type { AttractionType } from "@/components/NewAttractionModal/attraction.types";
import styles from "./AnalyticsClient.module.css";

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
}

/**
 * Colours drawn directly from the existing mood-tag design-system palette
 * so the chart feels native to the site.
 */
const TYPE_COLORS: Record<string, string> = {
  Restaurant: "#0EA5E9",  // sky-500  (primary brand)
  Bar:        "#7C3AED",  // violet-600 (Vibrant Nightlife)
  Café:       "#F59E0B",  // amber-500  (accent)
  Museum:     "#D97706",  // amber-600  (Cultural Heritage)
  Gallery:    "#E11D48",  // rose-600   (Instagrammable)
  Park:       "#059669",  // emerald-600 (Hidden Gems)
  Beach:      "#0891B2",  // cyan-600   (Beach Life)
  Landmark:   "#EA580C",  // orange-600 (Adventure)
  Shopping:   "#DC2626",  // red-600    (Food & Wine)
  Nightclub:  "#6D28D9",  // violet-700
  Theatre:    "#4F46E5",  // indigo-600
  Spa:        "#10B981",  // emerald-500
};

function getTypeColor(type: string, fallbackIndex: number): string {
  return TYPE_COLORS[type] ?? `hsl(${(fallbackIndex * 47) % 360}, 70%, 80%)`;
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

export function AnalyticsClient() {
  const [data, setData] = useState<GlobalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/analytics/global")
      .then((r) => r.json())
      .then((d: GlobalAnalytics) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const categories = data?.categoryDistribution ?? [];
  const categoryTotal = useMemo(
    () => categories.reduce((s, c) => s + c.count, 0),
    [categories],
  );

  // Pre-compute slice angles once
  const slices = useMemo(() => {
    let cum = 0;
    return categories.map((cat, i) => {
      const pct = categoryTotal > 0 ? cat.count / categoryTotal : 0;
      const startAngle = cum;
      const endAngle = cum + pct * 360;
      cum = endAngle;
      const color = getTypeColor(cat._id, i);
      return { cat, i, startAngle, endAngle, color };
    });
  }, [categories, categoryTotal]);

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
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className={styles.statCard}>
                <div className={styles.statIconCircle}>
                  <Icon size={18} aria-hidden="true" />
                </div>
                <span className={styles.statValue}>{value.toLocaleString()}</span>
                <span className={styles.statLabel}>{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Attraction Types Pie Chart ── */}
        <div className={styles.card}>
          <div className={styles.sectionHeadingRow}>
            <div className={styles.sectionIconCircle}>
              <BarChart2 size={18} aria-hidden="true" />
            </div>
            <h2 className={styles.sectionHeading}>Attraction Types</h2>
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
          ) : categories.length === 0 ? (
            <p className={styles.sectionEmpty}>No category data yet.</p>
          ) : (
            <div className={styles.pieSection}>
              {/* SVG donut chart */}
              <svg
                viewBox="0 0 220 220"
                width="220"
                height="220"
                className={styles.pieSvg}
                aria-label="Attraction types donut chart"
                role="img"
              >
                {slices.map(({ cat, i, startAngle, endAngle, color }) => (
                  <path
                    key={cat._id}
                    d={donutSlicePath(CX, CY, OUTER_R, INNER_R, startAngle, endAngle)}
                    fill={color}
                    stroke="white"
                    strokeWidth="2"
                    className={hoveredIndex === i ? styles.sliceHovered : styles.slice}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    aria-label={`${cat._id}: ${cat.count}`}
                  />
                ))}
              </svg>

              {/* Legend */}
              <ul className={styles.pieLegend} aria-label="Category breakdown">
                {slices.map(({ cat, i, color }) => {
                  const pct = categoryTotal > 0
                    ? ((cat.count / categoryTotal) * 100).toFixed(1)
                    : "0";
                  const icon = ICONS[cat._id as AttractionType];
                  const isHovered = hoveredIndex === i;
                  return (
                    <li
                      key={cat._id}
                      className={`${styles.legendItem} ${isHovered ? styles.legendItemHovered : ""}`}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      <span
                        className={styles.legendDot}
                        style={{ ["--dot-color" as string]: color }}
                      />
                      {icon && (
                        <span className={styles.legendIcon} aria-hidden="true">
                          {icon}
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
