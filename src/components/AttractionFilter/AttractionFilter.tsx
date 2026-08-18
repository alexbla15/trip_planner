"use client";

import { useId } from "react";
import { Search } from "lucide-react";
import { getIconComponent } from "@/components/IconPicker";
import { useAttractionTypes } from "@/hooks";
import type { AttractionFilterProps } from "./AttractionFilter.types";
import styles from "./AttractionFilter.module.css";

export function AttractionFilter({
  searchValue,
  onSearchChange,
  categories,
  selectedCategory = null,
  onCategoryChange,
  selectedCategories,
  onCategoriesChange,
  categoryLabel,
  types,
  selectedTypes = [],
  onTypesChange,
  typeLabel,
  placeholder = "Search attractions…",
  searchLabel = "Search attractions",
  resultCount,
  inputRef,
  hideSearch = false,
}: AttractionFilterProps) {
  const { byCategory } = useAttractionTypes();
  const inputId = useId();
  const multiSelect = !!onCategoriesChange;
  const activeCategories = selectedCategories ?? [];
  // Single-select mode needs 2+ categories to be worth filtering (a lone category vs.
  // "All" is a no-op). Multi-select mode has no "All" chip, so even one category is a
  // meaningful on/off toggle — show it.
  const showCategoryChips = multiSelect ? categories.length > 0 : categories.length > 1;
  const showTypeChips = multiSelect && !!types && types.length > 0;

  function isCategoryActive(cat: string): boolean {
    return multiSelect ? activeCategories.includes(cat) : selectedCategory === cat;
  }

  function handleCategoryClick(cat: string) {
    if (multiSelect) {
      onCategoriesChange!(
        activeCategories.includes(cat) ? activeCategories.filter((c) => c !== cat) : [...activeCategories, cat]
      );
    } else {
      onCategoryChange?.(selectedCategory === cat ? null : cat);
    }
  }

  function handleTypeClick(typeName: string) {
    if (!onTypesChange) return;
    onTypesChange(
      selectedTypes.includes(typeName) ? selectedTypes.filter((t) => t !== typeName) : [...selectedTypes, typeName]
    );
  }

  return (
    <div className={styles.attractionsToolbar}>
      {!hideSearch && (
        <>
          <label htmlFor={inputId} className={styles.srOnly}>{searchLabel}</label>
          <div className={styles.searchBar}>
            <Search size={15} className={styles.searchIcon} aria-hidden="true" />
            <input
              ref={inputRef}
              id={inputId}
              type="search"
              className={styles.searchInput}
              placeholder={placeholder}
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </div>
        </>
      )}
      {showCategoryChips && (
        <div className={categoryLabel ? styles.filterSection : undefined}>
          {categoryLabel && <span className={styles.filterSectionLabel}>{categoryLabel}</span>}
          <div className={styles.filterChips} role="group" aria-label="Filter by category">
            {!multiSelect && (
              <button
                type="button"
                className={`${styles.filterChip} ${selectedCategory === null ? styles.filterChipActive : ""}`}
                aria-pressed={selectedCategory === null}
                onClick={() => onCategoryChange?.(null)}
              >
                All
              </button>
            )}
            {categories.map((cat) => {
              const CatIcon = getIconComponent(byCategory[cat]?.[0]?.categoryIcon ?? "Globe");
              return (
                <button
                  key={cat}
                  type="button"
                  className={`${styles.filterChip} ${isCategoryActive(cat) ? styles.filterChipActive : ""}`}
                  aria-pressed={isCategoryActive(cat)}
                  onClick={() => handleCategoryClick(cat)}
                >
                  <CatIcon size={12} aria-hidden="true" />
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {showTypeChips && (
        <div className={typeLabel ? styles.filterSection : undefined}>
          {typeLabel && <span className={styles.filterSectionLabel}>{typeLabel}</span>}
          <div className={styles.filterChips} role="group" aria-label="Filter by type">
            {types!.map((t) => {
              const TypeIcon = getIconComponent(t.icon ?? "Globe");
              const active = selectedTypes.includes(t.name);
              return (
                <button
                  key={t.name}
                  type="button"
                  className={`${styles.filterChip} ${active ? styles.filterChipActive : ""}`}
                  aria-pressed={active}
                  onClick={() => handleTypeClick(t.name)}
                >
                  <TypeIcon size={12} aria-hidden="true" />
                  {t.name}
                </button>
              );
            })}
          </div>
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
