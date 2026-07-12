"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, MapPinned, Search, X } from "lucide-react";
import { TripCard } from "@/components/TripCard/TripCard";
import { TripCardSkeleton } from "@/components/TripCard/TripCardSkeleton";
import { NewTripCard } from "@/components/NewTripCard/NewTripCard";
import { useAuth } from "@/contexts/AuthContext";
import type { Trip } from "@/types/trip";
import styles from "./TripsClient.module.css";

const SKELETON_COUNT = 4;

export function TripsClient() {
  const { token } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch("/api/trips", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data: Trip[]) => setTrips(Array.isArray(data) ? data : []))
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trips;
    return trips.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.country.toLowerCase().includes(q)
    );
  }, [trips, search]);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <Link href="/" className={styles.backLink}>
            <ChevronLeft size={16} aria-hidden="true" />
            Dashboard
          </Link>
          <div className={styles.headingRow}>
            <h1 className={styles.heading}>
              <MapPinned size={26} className={styles.headingIcon} aria-hidden="true" />
              My Trips
            </h1>
            {!loading && (
              <span className={styles.count} aria-label={`${filtered.length} of ${trips.length} trips`}>
                {filtered.length} / {trips.length}
              </span>
            )}
          </div>
          <p className={styles.subtitle}>All your planned adventures in one place.</p>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search by name or country…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search trips"
            />
            {search && (
              <button
                className={styles.clearBtn}
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <TripCardSkeleton key={i} />
            ))}
            <NewTripCard />
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <Search size={40} className={styles.emptyIcon} aria-hidden="true" />
            <p className={styles.emptyHeading}>{trips.length === 0 ? "No trips yet" : "No trips found"}</p>
            <p className={styles.emptyBody}>
              {trips.length === 0
                ? "Start planning your first adventure!"
                : "Try a different name or country."}
            </p>
            {search ? (
              <button className={styles.clearSearchBtn} onClick={() => setSearch("")}>
                Clear search
              </button>
            ) : (
              <Link href="/new-trip" className={styles.clearSearchBtn}>
                Plan a Trip
              </Link>
            )}
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((trip) => (
              <Link key={trip._id} href={`/trips/${trip._id}`} className={styles.cardLink}>
                <TripCard trip={trip} />
              </Link>
            ))}
            <NewTripCard />
          </div>
        )}
      </div>
    </main>
  );
}
