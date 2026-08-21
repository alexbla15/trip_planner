"use client";

import { useId, useState } from "react";
import { Search, SlidersHorizontal, ChevronDown, X } from "lucide-react";
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
  collapsible = false,
  collapsibleLabel = "Filter by category or type",
}: AttractionFilterProps) {
  const { byCategory } = useAttractionTypes();
  const inputId = useId();
  const collapseId = useId();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const multiSelect = !!onCategoriesChange;
  const activeCategories = selectedCategories ?? [];
  // Single-select mode needs 2+ categories to be worth filtering (a lone category vs.
  // "All" is a no-op). Multi-select mode has no "All" chip, so even one category is a
  // meaningful on/off toggle — show it.
  const showCategoryChips = multiSelect ? categories.length > 0 : categories.length > 1;
  const showTypeChips = multiSelect && !!types && types.length > 0;
  const hasChips = showCategoryChips || showTypeChips;
  const activeChipCount = activeCategories.length + selectedTypes.length;

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

  function handleClearAll() {
    if (multiSelect) onCategoriesChange!([]);
    onTypesChange?.([]);
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
      {hasChips && (() => {
        const chips = (
          <>
            {multiSelect && activeChipCount > 0 && (
              <div className={styles.clearRow}>
                <button type="button" className={styles.clearAllBtn} onClick={handleClearAll}>
                  <X size={12} aria-hidden="true" />
                  Clear all ({activeChipCount})
                </button>
              </div>
            )}
            {showCategoryChips && (
              <div className={categoryLabel ? styles.filterSection : undefined}>
                {categoryLabel && (
                  <span className={styles.filterSectionLabel}>
                    {categoryLabel}
                    {multiSelect && activeCategories.length > 0 && (
                      <span className={styles.filterSectionCount}>{activeCategories.length}</span>
                    )}
                  </span>
                )}
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
              <div className={`${typeLabel ? styles.filterSection : ""} ${showCategoryChips ? styles.filterSectionDivided : ""}`}>
                {typeLabel && (
                  <span className={styles.filterSectionLabel}>
                    {typeLabel}
                    {selectedTypes.length > 0 && (
                      <span className={styles.filterSectionCount}>{selectedTypes.length}</span>
                    )}
                  </span>
                )}
                <div className={styles.filterChips} role="group" aria-label="Filter by type">
                  {types!.map((t) => {
                    const TypeIcon = getIconComponent(t.icon ?? "Globe");
                    const active = selectedTypes.includes(t.name);
                    return (
                      <button
                        key={t.name}
                        type="button"
                        className={`${styles.filterChip} ${styles.filterChipType} ${active ? styles.filterChipActive : ""}`}
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
          </>
        );

        if (!collapsible) return chips;

        return (
          <div>
            <button
              type="button"
              className={styles.chipFilterToggle}
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              aria-controls={collapseId}
            >
              <SlidersHorizontal size={14} aria-hidden="true" />
              {collapsibleLabel}
              {activeChipCount > 0 && (
                <span className={styles.chipFilterBadge}>{activeChipCount}</span>
              )}
              <ChevronDown
                size={14}
                aria-hidden="true"
                className={`${styles.chipFilterChevron} ${filtersOpen ? styles.chipFilterChevronOpen : ""}`}
              />
            </button>
            <div
              id={collapseId}
              className={`${styles.chipFilterCollapse} ${filtersOpen ? styles.chipFilterCollapseOpen : ""}`}
            >
              <div className={styles.chipFilterInner}>{chips}</div>
            </div>
          </div>
        );
      })()}
      {resultCount !== undefined && (
        <p aria-live="polite" className={styles.srOnly}>
          {resultCount} attraction{resultCount !== 1 ? "s" : ""} shown
        </p>
      )}
    </div>
  );
}
