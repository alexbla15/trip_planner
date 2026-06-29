"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPinned, Compass, ArrowRight } from "lucide-react";
import { TripCard } from "@/components/TripCard/TripCard";
import { TripCardSkeleton } from "@/components/TripCard/TripCardSkeleton";
import { NewTripCard } from "@/components/NewTripCard/NewTripCard";
import { ExploreSection } from "@/components/ExploreSection/ExploreSection";
import { RouteGuard } from "@/components/RouteGuard/RouteGuard";
import { useAuth } from "@/contexts/AuthContext";
import { mockExplore } from "@/data/mockExplore";
import type { Trip } from "@/types/trip";
import styles from "./page.module.css";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const SKELETON_COUNT = 3;

function HomeContent() {
  const { user, token } = useAuth();
  const greeting = getGreeting();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/trips", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data: Trip[]) => setTrips(Array.isArray(data) ? data : []))
      .catch(() => setTrips([]))
      .finally(() => setTripsLoading(false));
  }, [token]);

  return (
    <main id="main-content" className={styles.main}>
      {/* Hero */}
      <section className={styles.hero} aria-labelledby="hero-heading">
        <div className={styles.heroInner}>
          <h1 id="hero-heading" className={styles.heroGreeting}>
            {greeting}, {user?.name ?? "Traveler"}! ✈️
          </h1>
          <p className={styles.heroSubline}>
            Where will your next adventure take you?
          </p>
          <div className={styles.heroCtas}>
            <Link href="/new-trip" className={styles.btnPrimary} aria-label="Plan a new trip">
              <MapPinned size={18} aria-hidden="true" />
              Plan a New Trip
            </Link>
            <a href="#explore" className={styles.btnGhost} aria-label="Explore destinations">
              <Compass size={18} aria-hidden="true" />
              Explore Destinations
            </a>
          </div>
        </div>
      </section>

      {/* My Trips */}
      <section className={styles.myTrips} id="my-trips" aria-labelledby="my-trips-heading">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 id="my-trips-heading" className={styles.sectionTitle}>
              My Trips
            </h2>
            {!tripsLoading && (
              <span className={styles.sectionCount} aria-label={`${trips.length} trips`}>
                ({trips.length})
              </span>
            )}
            <Link href="/trips" className={styles.sectionSeeAll} aria-label="See all trips">
              See all <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <div className={styles.tripsGrid} aria-busy={tripsLoading}>
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
          </div>
        </div>
      </section>

      {/* Explore */}
      <ExploreSection items={mockExplore} />
    </main>
  );
}

export default function Home() {
  return (
    <RouteGuard>
      <HomeContent />
    </RouteGuard>
  );
}
