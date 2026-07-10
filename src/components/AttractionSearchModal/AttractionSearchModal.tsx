"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { X, Search, MapPin, Plus, PenLine, SearchX } from "lucide-react";
import { renderTypeIcon } from "@/components/IconPicker";
import { useAttractionTypes } from "@/hooks/useAttractionTypes";
import { AttractionFilter } from "@/components/AttractionFilter/AttractionFilter";
import type { Attraction } from "@/types/attraction";
import type { AttractionSearchModalProps } from "./AttractionSearchModal.types";
import styles from "./AttractionSearchModal.module.css";

type BodyState = "initial" | "loading" | "results" | "empty";

export function AttractionSearchModal({
  isOpen,
  onClose,
  country,
  onAdd,
  onCreateNew,
}: AttractionSearchModalProps) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { categories, findType } = useAttractionTypes();
  const [results, setResults] = useState<Attraction[]>([]);
  const [bodyState, setBodyState] = useState<BodyState>("initial");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedCategory(null);
      setResults([]);
      setBodyState("initial");
      requestAnimationFrame(() => searchRef.current?.focus());
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // ESC to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

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
        const params = new URLSearchParams({ country });
        if (q.trim()) params.set("q", q.trim());
        const res = await fetch(`/api/attractions?${params}`);
        const data = (await res.json()) as Attraction[];
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
    onAdd(attraction);
    onClose();
  }

  function handleCreateNew() {
    onCreateNew();
    onClose();
  }

  if (!mounted || !isOpen) return null;

  const modal = (
    <div
      className={styles.backdrop}
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add attraction to trip"
        className={styles.container}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Search size={18} className={styles.headerIcon} aria-hidden="true" />
            <h2 className={styles.title}>Add Attraction</h2>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Search bar + category chips */}
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

        {/* Body */}
        <div className={styles.body} aria-live="polite" aria-atomic="false">
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
                return (
                  <li key={attraction._id}>
                    <button
                      type="button"
                      className={styles.resultRow}
                      onClick={() => handleAdd(attraction)}
                      aria-label={`Add ${attraction.name} to trip`}
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
                      <Plus size={16} className={styles.resultAdd} aria-hidden="true" />
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

        {/* Footer */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.createBtn}
            onClick={handleCreateNew}
          >
            <PenLine size={15} aria-hidden="true" />
            Create new attraction
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
