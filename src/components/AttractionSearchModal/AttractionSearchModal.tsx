"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Search, MapPin, Plus, PenLine, SearchX } from "lucide-react";
import { renderTypeIcon } from "@/components/IconPicker";
import { useAttractionTypes } from "@/hooks";
import { searchAttractionsByCountry } from "@/services";
import { AttractionFilter } from "@/components/AttractionFilter";
import { ModalShell } from "@/components/Modal";
import type { Attraction } from "@/types/attraction";
import type { AttractionSearchModalProps } from "./AttractionSearchModal.types";
import styles from "./AttractionSearchModal.module.css";

const HEADING_ID = "attraction-search-modal-title";

type BodyState = "initial" | "loading" | "results" | "empty";

export function AttractionSearchModal({
  isOpen,
  onClose,
  country,
  onAdd,
  onCreateNew,
  token,
  existingAttractionIds = [],
}: AttractionSearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const existingIdSet = useMemo(() => new Set(existingAttractionIds), [existingAttractionIds]);
  const { categories, findType } = useAttractionTypes();
  const [results, setResults] = useState<Attraction[]>([]);
  const [bodyState, setBodyState] = useState<BodyState>("initial");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedCategory(null);
      setResults([]);
      setBodyState("initial");
    }
  }, [isOpen]);

  function runSearch(q: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q.trim()) {
      setBodyState("initial");
      setResults([]);
      return;
    }

    setBodyState("loading");
    debounceRef.current = setTimeout(async () => {
      try {
        const data = (await searchAttractionsByCountry(country, q, token)) as Attraction[];
        const list = Array.isArray(data) ? data : [];
        setResults(list);
        setBodyState(list.length > 0 ? "results" : "empty");
      } catch {
        setBodyState("empty");
        setResults([]);
      }
    }, 300);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    runSearch(value);
  }

  const filteredResults = useMemo(() => {
    if (!selectedCategory) return results;
    return results.filter((a) =>
      a.types.some((t) => findType(t)?.category === selectedCategory)
    );
  }, [results, selectedCategory, findType]);

  function handleAdd(attraction: Attraction) {
    if (existingIdSet.has(attraction._id)) return;
    onAdd(attraction);
    onClose();
  }

  function handleCreateNew() {
    onCreateNew();
    onClose();
  }

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      styles={styles}
      headingId={HEADING_ID}
      initialFocusRef={searchRef}
      header={
        <div className={styles.headerTitle}>
          <Search size={18} className={styles.headerIcon} aria-hidden="true" />
          <h2 id={HEADING_ID} className={styles.title}>Add Attraction</h2>
        </div>
      }
      footer={
        <button type="button" className={styles.createBtn} onClick={handleCreateNew}>
          <PenLine size={15} aria-hidden="true" />
          Create new attraction
        </button>
      }
      beforeBody={
        <div className={styles.searchBar}>
          <AttractionFilter
            searchValue={query}
            onSearchChange={handleQueryChange}
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            placeholder={`Search in ${country}…`}
            searchLabel={`Search attractions in ${country}`}
            inputRef={searchRef}
          />
        </div>
      }
    >
      <div aria-live="polite" aria-atomic="false">
        {bodyState === "initial" && (
          <div className={styles.placeholder}>
            <MapPin size={36} className={styles.placeholderIcon} aria-hidden="true" />
            <p className={styles.placeholderText}>
              Search for attractions in {country}
            </p>
          </div>
        )}

        {bodyState === "loading" && (
          <ul className={styles.skeletonList} aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className={styles.skeletonRow}>
                <div className={styles.skeletonCircle} />
                <div className={styles.skeletonLines}>
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonLineShort} />
                </div>
              </li>
            ))}
          </ul>
        )}

        {bodyState === "results" && filteredResults.length > 0 && (
          <ul className={styles.resultsList} aria-label="Search results">
            {filteredResults.map((attraction) => {
              const firstType = attraction.types?.[0];
              const icon = firstType ? renderTypeIcon(findType(firstType)?.icon ?? "Globe") : null;
              const isAdded = existingIdSet.has(attraction._id);
              return (
                <li key={attraction._id}>
                  <button
                    type="button"
                    className={`${styles.resultRow} ${isAdded ? styles.resultRowAdded : ""}`}
                    onClick={() => handleAdd(attraction)}
                    disabled={isAdded}
                    aria-label={`${isAdded ? "Already added: " : "Add "}${attraction.name}${isAdded ? "" : " to trip"}`}
                  >
                    <div className={styles.resultIcon} aria-hidden="true">
                      {icon ?? <MapPin size={15} />}
                    </div>
                    <div className={styles.resultInfo}>
                      <span className={styles.resultName}>{attraction.name}</span>
                      <span className={styles.resultMeta}>
                        {attraction.types?.join(", ")}
                        {attraction.city ? ` · ${attraction.city}` : ""}
                      </span>
                    </div>
                    {isAdded ? (
                      <span className={styles.addedTag}>Added</span>
                    ) : (
                      <Plus size={16} className={styles.resultAdd} aria-hidden="true" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {bodyState === "results" && filteredResults.length === 0 && (
          <div className={styles.placeholder}>
            <SearchX size={36} className={styles.placeholderIcon} aria-hidden="true" />
            <p className={styles.placeholderText}>
              No attractions found in this category
            </p>
            <button
              type="button"
              className={styles.createInlineBtn}
              onClick={() => setSelectedCategory(null)}
            >
              Show all results
            </button>
          </div>
        )}

        {bodyState === "empty" && (
          <div className={styles.placeholder}>
            <SearchX size={36} className={styles.placeholderIcon} aria-hidden="true" />
            <p className={styles.placeholderText}>
              No attractions found in {country}
            </p>
            <button
              type="button"
              className={styles.createInlineBtn}
              onClick={handleCreateNew}
            >
              <Plus size={14} aria-hidden="true" />
              Create a new one
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
