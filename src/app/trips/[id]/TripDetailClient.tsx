"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  Calendar,
  Globe,
  DollarSign,
  MapPinned,
  Plus,
} from "lucide-react";
import { MoodTagChip } from "@/components/MoodTagChip/MoodTagChip";
import type { Trip } from "@/types/trip";
import styles from "./TripDetailClient.module.css";

interface TripDetailClientProps {
  trip: Trip;
}

export function TripDetailClient({ trip }: TripDetailClientProps) {
  const { destination, country, coverImage, startDate, endDate, tags, budget, currency } = trip;

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <Image
          src={coverImage}
          alt={`${destination} cover`}
          fill
          className={styles.heroImage}
          sizes="100vw"
          priority
        />
        <div className={styles.heroOverlay} aria-hidden="true" />
        <div className={styles.heroContent}>
          <Link href="/trips" className={styles.backLink}>
            <ChevronLeft size={16} aria-hidden="true" />
            My Trips
          </Link>
          <h1 className={styles.destination}>{destination}</h1>
          <div className={styles.tags}>
            {tags.map((tag) => (
              <MoodTagChip key={tag} tag={tag} />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.card}>
          <h2 className={styles.sectionHeading}>Trip Overview</h2>

          <dl className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <dt className={styles.infoLabel}>
                <Globe size={14} aria-hidden="true" />
                Country
              </dt>
              <dd className={styles.infoValue}>{country}</dd>
            </div>

            <div className={styles.infoItem}>
              <dt className={styles.infoLabel}>
                <Calendar size={14} aria-hidden="true" />
                Dates
              </dt>
              <dd className={styles.infoValue}>
                {startDate} – {endDate}
              </dd>
            </div>

            {budget && (
              <div className={styles.infoItem}>
                <dt className={styles.infoLabel}>
                  <DollarSign size={14} aria-hidden="true" />
                  Budget
                </dt>
                <dd className={styles.infoValue}>
                  {currency && <span className={styles.currencyBadge}>{currency}</span>}
                  {Number(budget).toLocaleString()}
                </dd>
              </div>
            )}

            <div className={styles.infoItem}>
              <dt className={styles.infoLabel}>
                <MapPinned size={14} aria-hidden="true" />
                Attractions
              </dt>
              <dd className={styles.infoValue}>0 added</dd>
            </div>
          </dl>
        </div>

        <div className={styles.card}>
          <div className={styles.attractionsHeader}>
            <h2 className={styles.sectionHeading}>Attractions</h2>
            <Link href="/new-trip" className={styles.addBtn}>
              <Plus size={14} aria-hidden="true" />
              Add Attraction
            </Link>
          </div>
          <div className={styles.emptyAttractions}>
            <MapPinned size={36} className={styles.emptyIcon} aria-hidden="true" />
            <p className={styles.emptyText}>No attractions added yet.</p>
            <p className={styles.emptySubtext}>
              Start building your itinerary by adding places to visit.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
