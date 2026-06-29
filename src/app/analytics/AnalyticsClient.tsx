"use client";

import { useState, useEffect } from "react";
import {
  BarChart2,
  MapPinned,
  Landmark,
  Building2,
  Globe,
  Trophy,
} from "lucide-react";
import styles from "./AnalyticsClient.module.css";

interface GlobalAnalytics {
  summary: {
    totalTrips: number;
    totalAttractions: number;
    uniqueCitiesCovered: number;
    uniqueCountriesCovered: number;
    totalPlatformBudget: number;
  };
  categoryDistribution: Array<{ _id: string; count: number }>;
  topUsers: Array<{ ownerId: string; attractionsCount: number; countriesCount: number }>;
}

const SKELETON_ROWS = 5;

export function AnalyticsClient() {
  const [data, setData] = useState<GlobalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/analytics/global")
      .then((r) => r.json())
      .then((d: GlobalAnalytics) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const topCategories = data?.categoryDistribution.slice(0, 8) ?? [];
  const maxCount = topCategories.length > 0 ? Math.max(...topCategories.map((c) => c.count)) : 1;

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
          <div className={styles.statsGrid} aria-busy="true" aria-label="Loading stats">
            {[0, 1, 2, 3].map((i) => (
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
              { icon: MapPinned, label: "Total Trips", value: data!.summary.totalTrips },
              { icon: Landmark, label: "Total Attractions", value: data!.summary.totalAttractions },
              { icon: Building2, label: "Cities Covered", value: data!.summary.uniqueCitiesCovered },
              { icon: Globe, label: "Countries", value: data!.summary.uniqueCountriesCovered },
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

        {/* ── Category distribution ── */}
        <div className={styles.card}>
          <div className={styles.sectionHeadingRow}>
            <div className={styles.sectionIconCircle}>
              <BarChart2 size={18} aria-hidden="true" />
            </div>
            <h2 className={styles.sectionHeading}>Attraction Types</h2>
          </div>

          {loading ? (
            <div aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={styles.barRow}>
                  <div className={`${styles.skeletonBarLabel} ${styles.shimmer}`} />
                  <div className={`${styles.skeletonBarTrack} ${styles.shimmer}`} />
                  <div className={`${styles.skeletonBarCount} ${styles.shimmer}`} />
                </div>
              ))}
            </div>
          ) : (
            <section aria-label="Attraction category distribution">
              {topCategories.length === 0 ? (
                <p className={styles.sectionEmpty}>No category data yet.</p>
              ) : (
                topCategories.map((cat, i) => {
                  const pct = maxCount > 0 ? (cat.count / maxCount) * 100 : 0;
                  return (
                    <div
                      key={cat._id}
                      className={`${styles.barRow} ${i === topCategories.length - 1 ? styles.barRowLast : ""}`}
                    >
                      <span className={styles.barLabel}>{cat._id}</span>
                      <div
                        className={styles.barTrack}
                        role="img"
                        aria-label={`${cat._id}: ${cat.count} attractions`}
                      >
                        <div
                          className={styles.barFill}
                          style={{ ["--bar-width" as string]: `${pct}%` }}
                        />
                      </div>
                      <span className={styles.barCount}>{cat.count.toLocaleString()}</span>
                    </div>
                  );
                })
              )}
            </section>
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
                    <tr
                      key={u.ownerId}
                      className={`${styles.row} ${i === 0 ? styles.rowGold : ""}`}
                    >
                      <td className={styles.rankCell}>
                        {i === 0 ? (
                          <span className={styles.goldRank}>
                            <Trophy size={14} aria-hidden="true" />
                            1
                          </span>
                        ) : (
                          i + 1
                        )}
                      </td>
                      <td className={styles.explorerCell}>{u.ownerId.slice(0, 8)}</td>
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
