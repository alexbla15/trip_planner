"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, Search, MapPinned, X } from "lucide-react";
import { TripCard } from "@/components/TripCard/TripCard";
import { NewTripCard } from "@/components/NewTripCard/NewTripCard";
import type { Trip } from "@/types/trip";
import styles from "./TripsClient.module.css";

interface TripsClientProps {
  trips: Trip[];
}

export function TripsClient({ trips }: TripsClientProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trips;
    return trips.filter(
      (t) =>
        t.destination.toLowerCase().includes(q) ||
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
            <span className={styles.count} aria-label={`${filtered.length} of ${trips.length} trips`}>
              {filtered.length} / {trips.length}
            </span>
          </div>
          <p className={styles.subtitle}>All your planned adventures in one place.</p>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search by destination or country…"
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

        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <Search size={40} className={styles.emptyIcon} aria-hidden="true" />
            <p className={styles.emptyHeading}>No trips found</p>
            <p className={styles.emptyBody}>
              Try a different destination or country name.
            </p>
            <button className={styles.clearSearchBtn} onClick={() => setSearch("")}>
              Clear search
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            <NewTripCard />
            {filtered.map((trip) => (
              <Link key={trip.id} href={`/trips/${trip.id}`} className={styles.cardLink}>
                <TripCard trip={trip} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
