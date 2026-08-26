"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Search, MapPin, SearchX } from "lucide-react";
import { renderTypeIcon } from "@/components/IconPicker";
import { useAttractionTypes, useDebounce } from "@/hooks";
import { searchAttractionsByCountry } from "@/services";
import { ModalShell } from "@/components/Modal";
import type { Attraction } from "@/types/attraction";
import styles from "./ParentAttractionPicker.module.css";

const HEADING_ID = "parent-attraction-picker-title";

type BodyState = "initial" | "loading" | "results" | "empty";

interface ParentAttractionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  country: string;
  token?: string | null;
  /** The attraction being edited (if any) — excluded from results so it can't become its own parent. */
  excludeAttractionId?: string;
  onSelect: (attraction: Attraction) => void;
}

export function ParentAttractionPicker({ isOpen, onClose, country, token, excludeAttractionId, onSelect }: ParentAttractionPickerProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const { findType } = useAttractionTypes();
  const [results, setResults] = useState<Attraction[]>([]);
  const [bodyState, setBodyState] = useState<BodyState>("initial");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setBodyState("initial");
    }
  }, [isOpen]);

  // Nesting depth is unbounded — any attraction (including one that's already a child)
  // can be chosen as a parent. Only the attraction being edited itself is excluded here;
  // picking one of its own descendants (a cycle) is caught server-side, since that
  // requires walking the full descendant chain which isn't available in this search result set.
  const eligibleResults = useMemo(
    () => results.filter((a) => a._id !== excludeAttractionId),
    [results, excludeAttractionId],
  );

  useEffect(() => {
    if (!debouncedQuery.trim() || !country) return;
    let cancelled = false;
    (async () => {
      try {
        const data = (await searchAttractionsByCountry(country, debouncedQuery, token)) as Attraction[];
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setResults(list);
        setBodyState(list.length > 0 ? "results" : "empty");
      } catch {
        if (cancelled) return;
        setResults([]);
        setBodyState("empty");
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedQuery, country, token]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setBodyState("initial");
      setResults([]);
    } else {
      setBodyState("loading");
    }
  }

  function handlePick(attraction: Attraction) {
    onSelect(attraction);
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
          <h2 id={HEADING_ID} className={styles.title}>Located Inside</h2>
        </div>
      }
      beforeBody={
        <div className={styles.searchBar}>
          <div className={styles.searchInputWrap}>
            <Search size={15} className={styles.searchIcon} aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder={`Search attractions in ${country}…`}
              className={styles.searchInput}
              aria-label={`Search attractions in ${country}`}
            />
          </div>
        </div>
      }
    >
      {bodyState === "initial" && (
        <div className={styles.placeholder}>
          <MapPin size={32} className={styles.placeholderIcon} aria-hidden="true" />
          <p className={styles.placeholderText}>Search for the attraction this one is located inside</p>
        </div>
      )}

      {bodyState === "loading" && (
        <div className={styles.placeholder}>
          <p className={styles.placeholderText}>Searching…</p>
        </div>
      )}

      {bodyState === "results" && eligibleResults.length > 0 && (
        <ul className={styles.resultsList} aria-label="Search results">
          {eligibleResults.map((attraction) => {
            const firstType = attraction.types?.[0];
            const icon = firstType ? renderTypeIcon(findType(firstType)?.icon ?? "Globe") : null;
            return (
              <li key={attraction._id}>
                <button
                  type="button"
                  className={styles.resultRow}
                  onClick={() => handlePick(attraction)}
                  aria-label={`Set ${attraction.name} as parent`}
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
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {((bodyState === "results" && eligibleResults.length === 0) || bodyState === "empty") && (
        <div className={styles.placeholder}>
          <SearchX size={32} className={styles.placeholderIcon} aria-hidden="true" />
          <p className={styles.placeholderText}>No eligible attractions found</p>
        </div>
      )}
    </ModalShell>
  );
}
