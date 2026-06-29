"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  PenLine, Check, X, AlertCircle, Loader2,
  MapPinned, Landmark, Building2, Globe, DollarSign,
  BarChart2, Map, ChevronRight,
} from "lucide-react";
import { ICONS } from "@/components/NewAttractionModal/AttractionTypeChip";
import type { AttractionType } from "@/components/NewAttractionModal/attraction.types";
import { useAuth } from "@/contexts/AuthContext";
import { formatDisplayDate } from "@/lib/formatDate";
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
}

// ── Donut chart helpers (same as /analytics) ────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  Restaurant: "#0EA5E9",
  Bar:        "#7C3AED",
  Café:       "#F59E0B",
  Museum:     "#D97706",
  Gallery:    "#E11D48",
  Park:       "#059669",
  Beach:      "#0891B2",
  Landmark:   "#EA580C",
  Shopping:   "#DC2626",
  Nightclub:  "#6D28D9",
  Theatre:    "#4F46E5",
  Spa:        "#10B981",
};

function getTypeColor(type: string, index: number): string {
  return TYPE_COLORS[type] ?? `hsl(${(index * 47) % 360}, 65%, 50%)`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlicePath(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startAngle: number, endAngle: number,
): string {
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

const CX = 110; const CY = 110;
const OUTER_R = 100; const INNER_R = 60;

// ── Component ────────────────────────────────────────────────────────────────

export function ProfileClient() {
  const { user: authUser, token, login } = useAuth();

  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Chart hover
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

  // Donut chart slices
  const categories = analytics?.categoryDistribution ?? [];
  const categoryTotal = useMemo(
    () => categories.reduce((s, c) => s + c.count, 0),
    [categories],
  );

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
              {authUser.avatarUrl?.startsWith("http") ? (
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
                    <label htmlFor="edit-avatar" className={styles.editLabel}>
                      Avatar image URL
                    </label>
                    <input
                      id="edit-avatar"
                      type="url"
                      value={editAvatarUrl}
                      onChange={(e) => setEditAvatarUrl(e.target.value)}
                      className={styles.editInput}
                      placeholder="https://…"
                    />
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
          <div className={styles.statsGrid}>
            {[
              { icon: MapPinned,   label: "My Trips",         value: analytics.summary.totalTrips.toLocaleString() },
              { icon: Landmark,    label: "My Attractions",   value: analytics.summary.totalAttractions.toLocaleString() },
              { icon: Building2,   label: "Cities Visited",   value: analytics.summary.uniqueCitiesCovered.toLocaleString() },
              { icon: Globe,       label: "Countries",        value: analytics.summary.uniqueCountriesCovered.toLocaleString() },
              { icon: DollarSign,  label: "Budget Planned",   value: `$${analytics.summary.totalPersonalBudget.toLocaleString()}` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className={styles.statCard}>
                <div className={styles.statIconCircle}><Icon size={18} aria-hidden="true" /></div>
                <span className={styles.statValue}>{value}</span>
                <span className={styles.statLabel}>{label}</span>
              </div>
            ))}
          </div>
        ) : null}

        {/* ── My Category Breakdown ── */}
        <div className={styles.card}>
          <div className={styles.sectionHeadingRow}>
            <div className={styles.sectionIconCircle}><BarChart2 size={18} aria-hidden="true" /></div>
            <h2 className={styles.sectionHeading}>My Attraction Types</h2>
          </div>

          {analyticsLoading ? (
            <div className={styles.pieSkeleton} aria-hidden="true">
              <div className={`${styles.skeletonPieCircle} ${styles.shimmer}`} />
              <div className={styles.skeletonLegend}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={styles.skeletonLegendRow}>
                    <div className={`${styles.skeletonDot} ${styles.shimmer}`} />
                    <div className={`${styles.skeletonLegendText} ${styles.shimmer}`} />
                  </div>
                ))}
              </div>
            </div>
          ) : categories.length === 0 ? (
            <div className={styles.chartEmpty}>
              <BarChart2 size={36} className={styles.chartEmptyIcon} aria-hidden="true" />
              <p className={styles.chartEmptyText}>No attractions yet — start planning!</p>
              <Link href="/new-trip" className={styles.chartEmptyLink}>
                <MapPinned size={14} aria-hidden="true" />
                Plan a New Trip
              </Link>
            </div>
          ) : (
            <div className={styles.pieSection}>
              <svg
                viewBox="0 0 220 220"
                width="220"
                height="220"
                className={styles.pieSvg}
                aria-label="Personal attraction types donut chart"
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
                      <span className={styles.legendDot} style={{ ["--dot-color" as string]: color }} />
                      {icon && <span className={styles.legendIcon} aria-hidden="true">{icon}</span>}
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

        {/* ── Quick links ── */}
        <div className={styles.quickLinks}>
          {[
            { icon: MapPinned, title: "Plan a New Trip",  subtitle: "Start your next adventure", href: "/new-trip" },
            { icon: Map,       title: "My Trips",         subtitle: "Browse all your trips",     href: "/trips" },
          ].map(({ icon: Icon, title, subtitle, href }) => (
            <Link key={href} href={href} className={styles.quickCard}>
              <div className={styles.sectionIconCircle}><Icon size={18} aria-hidden="true" /></div>
              <span className={styles.quickTitle}>{title}</span>
              <span className={styles.quickSubtitle}>{subtitle}</span>
              <span className={styles.quickArrowRow}>
                <ChevronRight size={18} className={styles.quickArrow} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
