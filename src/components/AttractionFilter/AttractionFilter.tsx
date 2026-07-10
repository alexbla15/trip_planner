"use client";

import { useId } from "react";
import { Search } from "lucide-react";
import { getIconComponent } from "@/components/IconPicker";
import { useAttractionTypes } from "@/hooks/useAttractionTypes";
import type { AttractionFilterProps } from "./AttractionFilter.types";
import styles from "./AttractionFilter.module.css";

export function AttractionFilter({
  searchValue,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
  placeholder = "Search attractions…",
  searchLabel = "Search attractions",
  resultCount,
  inputRef,
}: AttractionFilterProps) {
  const { byCategory } = useAttractionTypes();
  const inputId = useId();
  const showChips = categories.length > 1;

  return (
    <div className={styles.attractionsToolbar}>
      <label htmlFor={inputId} className={styles.srOnly}>{searchLabel}</label>
      <div className={styles.searchBar}>
        <Search size={15} className={styles.searchIcon} aria-hidden="true" />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          className={styles.searchInput}
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {showChips && (
        <div className={styles.filterChips} role="group" aria-label="Filter by category">
          <button
            type="button"
            className={`${styles.filterChip} ${selectedCategory === null ? styles.filterChipActive : ""}`}
            aria-pressed={selectedCategory === null}
            onClick={() => onCategoryChange(null)}
          >
            All
          </button>
          {categories.map((cat) => {
            const CatIcon = getIconComponent(byCategory[cat]?.[0]?.categoryIcon ?? "Globe");
            return (
              <button
                key={cat}
                type="button"
                className={`${styles.filterChip} ${selectedCategory === cat ? styles.filterChipActive : ""}`}
                aria-pressed={selectedCategory === cat}
                onClick={() => onCategoryChange(selectedCategory === cat ? null : cat)}
              >
                <CatIcon size={12} aria-hidden="true" />
                {cat}
              </button>
            );
          })}
        </div>
      )}
      {resultCount !== undefined && (
        <p aria-live="polite" className={styles.srOnly}>
          {resultCount} attraction{resultCount !== 1 ? "s" : ""} shown
        </p>
      )}
    </div>
  );
}
