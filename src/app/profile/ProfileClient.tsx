"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  PenLine, Check, X, AlertCircle, Loader2,
  MapPinned, Landmark, Building2, Globe, DollarSign,
  BarChart2, Lock, Sparkles, ChevronDown,
} from "lucide-react";
import { CategoryDonutChart } from "@/components";
import { useAttractionTypes } from "@/hooks/useAttractionTypes";

const DynamicCitiesMap = dynamic(
  () => import("@/components/CitiesMap/CitiesMap").then((m) => ({ default: m.CitiesMap })),
  { ssr: false, loading: () => <div className={styles.mapLoading}>Loading map…</div> },
);

const DynamicCountriesMap = dynamic(
  () => import("@/components/CountriesMap/CountriesMap").then((m) => ({ default: m.CountriesMap })),
  { ssr: false, loading: () => <div className={styles.mapLoading}>Loading map…</div> },
);
import { useAuth } from "@/contexts/AuthContext";
import { formatDisplayDate } from "@/lib/formatDate";
import { formatPrice } from "@/lib/currencies";
import { AVATARS } from "@/lib/avatarConstants";
import styles from "./ProfileClient.module.css";

// ── Types ───────────────────────────────────────────────────────────────────

interface PersonalAnalytics {
  summary: {
    totalTrips: number;
    totalAttractions: number;
    uniqueCitiesCovered: number;
    uniqueCountriesCovered: number;
    totalPersonalBudget: number;
  };
  categoryDistribution: Array<{ _id: string; count: number }>;
  topCities: Array<{ _id: string; count: number; country?: string; lat?: number; lng?: number }>;
  topTrips: Array<{ name: string; tripId: string; attractionCount: number }>;
  topCountries: Array<{ _id: string; count: number }>;
  moodDistribution: Array<{ _id: string; count: number; icon?: string; color?: string }>;
}

interface DetailRow {
  name: string;
  count: number;
  href?: string;
  subtitle?: string;
}


// ── Component ────────────────────────────────────────────────────────────────

export function ProfileClient() {
  const { user: authUser, token, login } = useAuth();
  const { byCategory } = useAttractionTypes();

  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Password change state
  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  // Stat card drill-down
  const [activeStat, setActiveStat] = useState<string | null>(null);
  const [cityCountryFilter, setCityCountryFilter] = useState<string>("all");

  // Fetch personal analytics
  useEffect(() => {
    if (!token) return;
    fetch("/api/analytics/summary", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d: PersonalAnalytics) => setAnalytics(d))
      .catch(() => setAnalytics(null))
      .finally(() => setAnalyticsLoading(false));
  }, [token]);

  // Seed edit form when user is available
  useEffect(() => {
    if (authUser) {
      setEditName(authUser.name);
      setEditAvatarUrl(authUser.avatarUrl ?? "");
    }
  }, [authUser]);

  function startEditing() {
    setEditName(authUser?.name ?? "");
    setEditAvatarUrl(authUser?.avatarUrl ?? "");
    setSaveError("");
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setSaveError("");
  }

  function cancelPwChange() {
    setShowPwForm(false);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setPwError(""); setPwSuccess("");
  }

  async function handlePasswordChange() {
    if (!token) return;
    if (newPw !== confirmPw) { setPwError("New passwords do not match"); return; }
    if (newPw.length < 8)    { setPwError("New password must be at least 8 characters"); return; }
    setPwSaving(true); setPwError(""); setPwSuccess("");
    try {
      const res = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error ?? "Failed to update password"); return; }
      setPwSuccess("Password updated successfully.");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => { setShowPwForm(false); setPwSuccess(""); }, 2000);
    } catch {
      setPwError("Network error. Please try again.");
    } finally {
      setPwSaving(false);
    }
  }

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editName, avatarUrl: editAvatarUrl || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Failed to save profile");
        return;
      }
      // Re-hydrate AuthContext so Navbar name updates
      await login(token);
      setIsEditing(false);
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const rawTypes = analytics?.categoryDistribution ?? [];

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
  }, [rawTypes, byCategory]);

  const detailRows = useMemo((): DetailRow[] => {
    if (!activeStat || !analytics) return [];
    switch (activeStat) {
      case "My Trips":
        return (analytics.topTrips ?? []).map((t) => ({
          name: t.name,
          count: t.attractionCount,
          href: `/trips/${t.tripId}`,
        }));
      case "My Attractions":
        return categoryAggregated.map((c) => ({ name: c._id, count: c.count }));
      case "Cities Visited":
        return (analytics.topCities ?? [])
          .filter((c) => cityCountryFilter === "all" || c.country === cityCountryFilter)
          .map((c) => ({
            name: c._id || "Unknown",
            count: c.count,
            subtitle: c.country,
          }));
      case "Countries":
        return (analytics.topCountries ?? []).map((c) => ({
          name: c._id || "Unknown",
          count: c.count,
        }));
      default:
        return [];
    }
  }, [activeStat, analytics, categoryAggregated, cityCountryFilter]);

  const showCitiesMap = activeStat === "Cities Visited" && !analyticsLoading && !!analytics;
  const showCountriesMap = activeStat === "Countries" && !analyticsLoading && !!analytics;

  const cityCountryOptions = useMemo(() => {
    if (!showCitiesMap) return [];
    const set = new Set<string>();
    for (const c of analytics?.topCities ?? []) {
      if (c.country) set.add(c.country);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [showCitiesMap, analytics]);

  const mappedCities = useMemo(() => {
    if (!showCitiesMap) return [];
    return (analytics?.topCities ?? []).filter(
      (c) => cityCountryFilter === "all" || c.country === cityCountryFilter,
    );
  }, [showCitiesMap, analytics, cityCountryFilter]);

  if (!authUser) return null;

  const userInitial = authUser.name?.[0]?.toUpperCase() ?? "?";

  return (
    <main className={styles.page}>
      {/* Hero */}
      <div className={styles.heroSection}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>My Profile</h1>
          <p className={styles.heroSubtitle}>
            Manage your account and view your travel stats.
          </p>
        </div>
      </div>

      <div className={styles.content}>
        {/* ── Profile header card ── */}
        <div className={styles.card}>
          <div className={styles.profileCard}>
            {/* Avatar */}
            <div className={styles.avatarCircle} aria-hidden="true">
              {authUser.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={authUser.avatarUrl}
                  alt=""
                  className={styles.avatarImage}
                />
              ) : (
                userInitial
              )}
            </div>

            {/* Info */}
            <div className={styles.infoBlock}>
              {isEditing ? (
                <div className={styles.editForm}>
                  <div className={styles.editField}>
                    <label htmlFor="edit-name" className={styles.editLabel}>
                      Display name
                    </label>
                    <input
                      id="edit-name"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={styles.editInput}
                      aria-required="true"
                    />
                  </div>
                  <div className={styles.editField}>
                    <label className={styles.editLabel}>Avatar</label>
                    <div className={styles.avatarPicker} role="group" aria-label="Choose avatar">
                      {AVATARS.map((src) => (
                        <button
                          key={src}
                          type="button"
                          className={`${styles.avatarOption} ${editAvatarUrl === src ? styles.avatarOptionSelected : ""}`}
                          onClick={() => setEditAvatarUrl(src)}
                          aria-pressed={editAvatarUrl === src}
                          aria-label={src.split("/").pop()?.replace(/\.\w+$/, "")}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" className={styles.avatarOptionImg} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.editBtns}>
                    <button
                      type="button"
                      className={styles.saveBtn}
                      onClick={handleSave}
                      disabled={saving || !editName.trim()}
                    >
                      {saving ? (
                        <><Loader2 size={14} className={styles.spinnerIcon} aria-hidden="true" /> Saving…</>
                      ) : (
                        <><Check size={14} aria-hidden="true" /> Save</>
                      )}
                    </button>
                    <button type="button" className={styles.cancelBtn} onClick={cancelEditing}>
                      <X size={14} aria-hidden="true" />
                      Cancel
                    </button>
                  </div>
                  {saveError && (
                    <p className={styles.saveError} role="alert">
                      <AlertCircle size={12} aria-hidden="true" />
                      {saveError}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className={styles.nameRow}>
                    <span className={styles.userName}>{authUser.name}</span>
                    <button
                      type="button"
                      className={styles.editTrigger}
                      onClick={startEditing}
                      aria-label="Edit profile"
                    >
                      <PenLine size={16} aria-hidden="true" />
                    </button>
                  </div>
                  <p className={styles.userEmail}>{authUser.email}</p>
                  {authUser.createdAt && (
                    <p className={styles.userJoined}>
                      Member since {formatDisplayDate(authUser.createdAt)}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Security card ── */}
        <div className={styles.card}>
          <div className={styles.sectionHeadingRow}>
            <div className={styles.sectionIconCircle}><Lock size={18} aria-hidden="true" /></div>
            <h2 className={styles.sectionHeading}>Security</h2>
          </div>

          {!showPwForm ? (
            <div className={styles.pwIdle}>
              <p className={styles.pwIdleText}>Keep your account secure by updating your password regularly.</p>
              <button type="button" className={styles.pwTriggerBtn} onClick={() => setShowPwForm(true)}>
                Change Password
              </button>
            </div>
          ) : (
            <div className={styles.editForm}>
              <div className={styles.editField}>
                <label htmlFor="current-pw" className={styles.editLabel}>Current password</label>
                <input
                  id="current-pw"
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className={styles.editInput}
                  autoComplete="current-password"
                />
              </div>
              <div className={styles.editField}>
                <label htmlFor="new-pw" className={styles.editLabel}>New password</label>
                <input
                  id="new-pw"
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className={styles.editInput}
                  autoComplete="new-password"
                />
              </div>
              <div className={styles.editField}>
                <label htmlFor="confirm-pw" className={styles.editLabel}>Confirm new password</label>
                <input
                  id="confirm-pw"
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className={styles.editInput}
                  autoComplete="new-password"
                />
              </div>
              <div className={styles.editBtns}>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={handlePasswordChange}
                  disabled={pwSaving || !currentPw || !newPw || !confirmPw}
                >
                  {pwSaving ? (
                    <><Loader2 size={14} className={styles.spinnerIcon} aria-hidden="true" /> Saving…</>
                  ) : (
                    <><Check size={14} aria-hidden="true" /> Update Password</>
                  )}
                </button>
                <button type="button" className={styles.cancelBtn} onClick={cancelPwChange}>
                  <X size={14} aria-hidden="true" />
                  Cancel
                </button>
              </div>
              {pwError && (
                <p className={styles.saveError} role="alert">
                  <AlertCircle size={12} aria-hidden="true" />
                  {pwError}
                </p>
              )}
              {pwSuccess && (
                <p className={styles.pwSuccess} role="status">
                  <Check size={12} aria-hidden="true" />
                  {pwSuccess}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Personal stats cards ── */}
        {analyticsLoading ? (
          <div className={styles.statsGrid} aria-busy="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.statCard} aria-hidden="true">
                <div className={`${styles.skeletonCircle} ${styles.shimmer}`} />
                <div className={`${styles.skeletonNumber} ${styles.shimmer}`} />
                <div className={`${styles.skeletonLabel} ${styles.shimmer}`} />
              </div>
            ))}
          </div>
        ) : analytics ? (
          <>
            <div className={styles.statsGrid}>
              {[
                { icon: MapPinned,  label: "My Trips",       value: analytics.summary.totalTrips.toLocaleString() },
                { icon: Landmark,   label: "My Attractions", value: analytics.summary.totalAttractions.toLocaleString() },
                { icon: Building2,  label: "Cities Visited", value: analytics.summary.uniqueCitiesCovered.toLocaleString() },
                { icon: Globe,      label: "Countries",      value: analytics.summary.uniqueCountriesCovered.toLocaleString() },
              ].map(({ icon: Icon, label, value }) => (
                <button
                  key={label}
                  type="button"
                  className={`${styles.statCard} ${styles.statCardClickable} ${activeStat === label ? styles.statCardActive : ""}`}
                  onClick={() => {
                    setActiveStat(activeStat === label ? null : label);
                    setCityCountryFilter("all");
                  }}
                  aria-pressed={activeStat === label}
                >
                  <div className={styles.statIconCircle}><Icon size={18} aria-hidden="true" /></div>
                  <span className={styles.statValue}>{value}</span>
                  <span className={styles.statLabel}>{label}</span>
                </button>
              ))}
              <div className={styles.statCard}>
                <div className={styles.statIconCircle}><DollarSign size={18} aria-hidden="true" /></div>
                <span className={styles.statValue}>{formatPrice(analytics.summary.totalPersonalBudget, "USD")}</span>
                <span className={styles.statLabel}>Budget Planned</span>
              </div>
            </div>
            {activeStat && (detailRows.length > 0 || showCitiesMap || showCountriesMap) && (
              <div className={styles.detailPanel}>
                <h3 className={styles.detailPanelHeading}>{activeStat}</h3>

                {/* Country filter — Cities Visited only */}
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

                {/* Countries choropleth map */}
                {showCountriesMap && analytics.topCountries.length > 0 && (
                  <div className={styles.mapContainer}>
                    <DynamicCountriesMap
                      countries={analytics.topCountries}
                      countLabel="trip"
                    />
                  </div>
                )}

                {/* Cities polygon map */}
                {showCitiesMap && mappedCities.length > 0 && (
                  <div className={styles.mapContainer}>
                    <DynamicCitiesMap
                      cities={mappedCities}
                      selectedCountry={cityCountryFilter !== "all" ? cityCountryFilter : undefined}
                    />
                  </div>
                )}

                {/* Ranked list — hidden for Countries (map is sufficient) */}
                {!showCountriesMap && detailRows.length > 0 && (
                  <ol className={styles.detailList}>
                    {detailRows.map((row, i) => (
                      <li key={row.name} className={styles.detailRow}>
                        <span className={styles.detailRank}>{i + 1}</span>
                        <span className={styles.detailNameCol}>
                          {row.href ? (
                            <Link href={row.href} className={styles.detailLink}>
                              <span className={styles.detailName}>{row.name}</span>
                            </Link>
                          ) : (
                            <span className={styles.detailName}>{row.name}</span>
                          )}
                          {row.subtitle && <span className={styles.detailSubtitle}>{row.subtitle}</span>}
                        </span>
                        <span className={styles.detailCount}>{row.count.toLocaleString()}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </>
        ) : null}

        {/* ── Attractions by Category ── */}
        <div className={styles.card}>
          <div className={styles.sectionHeadingRow}>
            <div className={styles.sectionIconCircle}><BarChart2 size={18} aria-hidden="true" /></div>
            <h2 className={styles.sectionHeading}>Attractions by Category</h2>
          </div>
          <CategoryDonutChart
            rawTypes={rawTypes}
            loading={analyticsLoading}
            emptyText="No attractions yet — start planning!"
          />
        </div>

        {/* ── Mood Tag Distribution ── */}
        {!analyticsLoading && analytics && analytics.moodDistribution.length > 0 && (
          <div className={styles.card}>
            <div className={styles.sectionHeadingRow}>
              <div className={styles.sectionIconCircle}><Sparkles size={18} aria-hidden="true" /></div>
              <h2 className={styles.sectionHeading}>My Trip Moods</h2>
            </div>
            <ul className={styles.moodList}>
              {(() => {
                const maxCount = Math.max(1, ...analytics.moodDistribution.map((m) => m.count));
                return analytics.moodDistribution.map(({ _id, count, color }) => {
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <li key={_id} className={styles.moodRow}>
                      <span className={styles.moodName}>{_id}</span>
                      <span className={styles.moodBarTrack}>
                        <span
                          className={styles.moodBarFill}
                          style={{
                            ["--bar-width" as string]: `${pct}%`,
                            ["--bar-color" as string]: color ?? "var(--color-primary)",
                          }}
                        />
                      </span>
                      <span className={styles.moodCount}>{count}</span>
                    </li>
                  );
                });
              })()}
            </ul>
          </div>
        )}

      </div>
    </main>
  );
}
