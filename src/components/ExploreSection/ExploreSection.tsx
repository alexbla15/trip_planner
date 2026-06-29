"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Globe,
  Moon,
  Landmark,
  Mountain,
  Waves,
  UtensilsCrossed,
  Gem,
  Sparkles,
  Heart,
  Users,
  Backpack,
  Anchor,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ExploreCard } from "@/components/ExploreCard/ExploreCard";
import { ALL_MOOD_TAGS } from "@/types/trip";
import styles from "./ExploreSection.module.css";
import type { ExploreSectionProps } from "./ExploreSection.types";

const TAG_ICONS: Record<string, LucideIcon> = {
  All:                    Globe,
  "Vibrant Nightlife":    Moon,
  "Cultural Heritage":    Landmark,
  "Adventure":            Mountain,
  "Beach Life":           Waves,
  "Food & Wine":          UtensilsCrossed,
  "Luxury":               Gem,
  "Relaxation & Wellness":Sparkles,
  "Couples & Romantic":   Heart,
  "Family":               Users,
  "Backpacking & Budget": Backpack,
  "Cruises":              Anchor,
};

const PAGE_SIZE = 6;

export function ExploreSection({ items }: ExploreSectionProps) {
  const [activeTag, setActiveTag] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  function handleTagChange(tag: string) {
    setActiveTag(tag);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  const byTag =
    activeTag === "All"
      ? items
      : items.filter((i) => (i.tags ?? [i.tag]).includes(activeTag));

  const query = search.trim().toLowerCase();
  const filtered = query
    ? byTag.filter((i) => i.destination.toLowerCase().includes(query))
    : byTag;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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

        <div className={styles.searchRow}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search destinations…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="Search destinations"
            />
          </div>
        </div>

        <div
          className={styles.filtersRow}
          role="group"
          aria-label="Filter by mood"
        >
          {(["All", ...ALL_MOOD_TAGS] as const).map((tag) => {
            const Icon = TAG_ICONS[tag];
            return (
              <button
                key={tag}
                className={[
                  styles.filterChip,
                  activeTag === tag ? styles.filterChipActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={activeTag === tag}
                onClick={() => handleTagChange(tag)}
              >
                <Icon size={14} aria-hidden="true" />
                {tag}
              </button>
            );
          })}
        </div>

        <div className={styles.grid} aria-live="polite" aria-atomic="false">
          {paginated.length > 0 ? (
            paginated.map((item) => <ExploreCard key={item.id} item={item} />)
          ) : (
            <p className={styles.emptyState}>
              No trips found for this vibe yet. Check back soon!
            </p>
          )}
        </div>

        {totalPages > 1 && (
          <div className={styles.pagination} role="navigation" aria-label="Pagination">
            <button
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              Prev
            </button>
            <span className={styles.pageInfo} aria-live="polite">
              {safePage} / {totalPages}
            </span>
            <button
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Next page"
            >
              Next
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
