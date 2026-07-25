"use client";

import { useState } from "react";
import { Globe, Search } from "lucide-react";
import { useMoodTags } from "@/hooks";
import { getIconComponent } from "@/components/IconPicker";
import { ExploreCard } from "@/components/ExploreCard";
import { Carousel } from "@/components/Carousel";
import styles from "./ExploreSection.module.css";
import type { ExploreSectionProps } from "./ExploreSection.types";

export function ExploreSection({ items }: ExploreSectionProps) {
  const { tags: moodTags } = useMoodTags();
  const [activeTag, setActiveTag] = useState<string>("All");
  const [search, setSearch] = useState("");

  function handleTagChange(tag: string) {
    setActiveTag(tag);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  const byTag =
    activeTag === "All"
      ? items
      : items.filter((i) => (i.tags ?? [i.tag]).includes(activeTag));

  const query = search.trim().toLowerCase();
  const filtered = query
    ? byTag.filter((i) => i.destination.toLowerCase().includes(query))
    : byTag;

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
          {[{ name: "All", icon: "Globe" }, ...moodTags].map((tag) => {
            const Icon = getIconComponent(tag.icon);
            return (
              <button
                key={tag.name}
                className={[
                  styles.filterChip,
                  activeTag === tag.name ? styles.filterChipActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={activeTag === tag.name}
                onClick={() => handleTagChange(tag.name)}
              >
                <Icon size={14} aria-hidden="true" />
                {tag.name}
              </button>
            );
          })}
        </div>

        <div aria-live="polite" aria-atomic="false">
          {filtered.length > 0 ? (
            <Carousel ariaLabel="Explore destinations">
              {filtered.map((item) => (
                <ExploreCard key={item.id} item={item} />
              ))}
            </Carousel>
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
