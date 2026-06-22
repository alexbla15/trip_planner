"use client";

import { useState } from "react";
import { ExploreCard } from "@/components/ExploreCard/ExploreCard";
import { ALL_MOOD_TAGS } from "@/types/trip";
import styles from "./ExploreSection.module.css";
import type { ExploreSectionProps } from "./ExploreSection.types";

export function ExploreSection({ items }: ExploreSectionProps) {
  const [activeTag, setActiveTag] = useState<string>("All");

  const filtered =
    activeTag === "All" ? items : items.filter((i) => i.tag === activeTag);

  return (
    <section className={styles.section} id="explore" aria-labelledby="explore-heading">
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 id="explore-heading" className={styles.title}>
            Explore the World
          </h2>
          <p className={styles.subtitle}>
            Discover trips and attractions shared by the community
          </p>
        </div>

        <div
          className={styles.filtersRow}
          role="group"
          aria-label="Filter by mood"
        >
          <button
            className={[
              styles.filterChip,
              activeTag === "All" ? styles.filterChipActive : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={activeTag === "All"}
            onClick={() => setActiveTag("All")}
          >
            All
          </button>
          {ALL_MOOD_TAGS.map((tag) => (
            <button
              key={tag}
              className={[
                styles.filterChip,
                activeTag === tag ? styles.filterChipActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={activeTag === tag}
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className={styles.grid}>
          {filtered.length > 0 ? (
            filtered.map((item) => <ExploreCard key={item.id} item={item} />)
          ) : (
            <p className={styles.emptyState}>
              No trips found for this vibe yet. Check back soon!
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
