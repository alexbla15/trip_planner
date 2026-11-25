"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TripCard, TripCardSkeleton, NewTripCard, ExploreSection, Carousel } from "@/components";
import { useAuth } from "@/contexts/AuthContext";
import { listTrips, getExploreItems } from "@/services";
import { getGreeting } from "@/lib";
import type { Trip, ExploreItem } from "@/types/trip";
import styles from "./page.module.css";

const SKELETON_COUNT = 3;

export function HomeClient() {
  const { user, token } = useAuth();
  const greeting = getGreeting();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [tripsError, setTripsError] = useState(false);
  const [tripsReloadKey, setTripsReloadKey] = useState(0);

  const [exploreItems, setExploreItems] = useState<ExploreItem[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listTrips(token)
      .then((data) => {
        if (cancelled) return;
        setTrips(Array.isArray(data) ? (data as Trip[]) : []);
        setTripsError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setTrips([]);
        setTripsError(true);
      })
      .finally(() => {
        if (!cancelled) setTripsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, tripsReloadKey]);

  function retryTrips() {
    setTripsError(false);
    setTripsLoading(true);
    setTripsReloadKey((k) => k + 1);
  }

  useEffect(() => {
    getExploreItems()
      .then((data) => setExploreItems(Array.isArray(data) ? (data as ExploreItem[]) : []))
      .catch(() => setExploreItems([]));
  }, []);

  return (
    <main id="main-content" className={styles.main}>
      {/* Hero */}
      <section className={styles.hero} aria-labelledby="hero-heading">
        <div className={styles.heroInner}>
          <h1 id="hero-heading" className={styles.heroGreeting}>
            {greeting}, {user?.name ?? "Traveler"}!
          </h1>
          <p className={styles.heroSubline}>
            Where will your next adventure take you?
          </p>
          <Link href="/new-trip" className={styles.heroCta}>
            Plan a new trip <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* My Trips */}
      <section className={styles.myTrips} id="my-trips" aria-labelledby="my-trips-heading">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 id="my-trips-heading" className={styles.sectionTitle}>
              My Trips
            </h2>
            {!tripsLoading && !tripsError && (
              <span className={styles.sectionCount} aria-label={`${trips.length} trips`}>
                ({trips.length})
              </span>
            )}
            <Link href="/trips" className={styles.sectionSeeAll} aria-label="See all trips">
              See all <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {tripsError && (
            <div className={styles.tripsAlert} role="alert">
              <span>We couldn&apos;t load your trips.</span>
              <button type="button" className={styles.retryBtn} onClick={retryTrips}>
                Try again
              </button>
            </div>
          )}

          {!tripsLoading && !tripsError && trips.length === 0 && (
            <p className={styles.emptyText}>No trips yet. Start with one.</p>
          )}

          <div aria-busy={tripsLoading}>
            <Carousel ariaLabel="Your trips">
              <NewTripCard />
              {tripsLoading
                ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                    <TripCardSkeleton key={i} />
                  ))
                : trips.map((trip) => (
                    <Link key={trip._id} href={`/trips/${trip._id}`} className={styles.cardLink}>
                      <TripCard trip={trip} />
                    </Link>
                  ))}
            </Carousel>
          </div>
        </div>
      </section>

      {/* Explore */}
      <ExploreSection items={exploreItems} />
    </main>
  );
}
