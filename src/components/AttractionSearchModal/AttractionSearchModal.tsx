"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { X, Search, MapPin, Plus, PenLine, SearchX, ChevronLeft } from "lucide-react";
import { ICONS } from "@/components/NewAttractionModal/AttractionTypeChip";
import {
  TYPE_CATEGORIES,
  CATEGORY_ORDER,
  CATEGORY_ICONS,
} from "@/components/NewAttractionModal/attraction.constants";
import type { AttractionType } from "@/components/NewAttractionModal/attraction.types";
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
  const [selectedType, setSelectedType] = useState<AttractionType | null>(null);
  const [activeSearchCategory, setActiveSearchCategory] = useState<string | null>(null);
  const [results, setResults] = useState<Attraction[]>([]);
  const [bodyState, setBodyState] = useState<BodyState>("initial");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedType(null);
      setActiveSearchCategory(null);
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

  function runSearch(q: string, type: AttractionType | null) {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q.trim() && !type) {
      setBodyState("initial");
      setResults([]);
      return;
    }

    setBodyState("loading");
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ country });
        if (q.trim()) params.set("q", q.trim());
        if (type) params.set("type", type);
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
    runSearch(value, selectedType);
  }

  function handleTypeToggle(type: AttractionType) {
    const next = selectedType === type ? null : type;
    setSelectedType(next);
    runSearch(query, next);
  }

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

        {/* Search bar */}
        <div className={styles.searchBar}>
          <div className={styles.searchWrapper}>
            <Search size={15} className={styles.searchIcon} aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              className={styles.searchInput}
              placeholder={`Search in ${country}…`}
              aria-label={`Search attractions in ${country}`}
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
            />
          </div>

          {/* Category filter — two-level */}
          <div className={styles.categoryFilter}>
            {activeSearchCategory === null ? (
              <div className={styles.catChips} role="group" aria-label="Filter by category">
                <button
                  type="button"
                  className={`${styles.catChip} ${selectedType === null ? styles.catChipActive : ""}`}
                  aria-pressed={selectedType === null}
                  onClick={() => {
                    setSelectedType(null);
                    runSearch(query, null);
                  }}
                >
                  All
                </button>
                {CATEGORY_ORDER.map((cat) => {
                  const catTypes = TYPE_CATEGORIES[cat];
                  const CatIcon = CATEGORY_ICONS[cat];
                  const isActive = selectedType !== null && (catTypes as string[]).includes(selectedType);
                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`${styles.catChip} ${isActive ? styles.catChipActive : ""}`}
                      aria-pressed={isActive}
                      onClick={() => setActiveSearchCategory(cat)}
                    >
                      {CatIcon && <CatIcon size={12} aria-hidden="true" />}
                      {cat}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  className={styles.catBackBtn}
                  onClick={() => setActiveSearchCategory(null)}
                >
                  <ChevronLeft size={13} aria-hidden="true" />
                  All categories
                </button>
                <div
                  className={styles.typeChips}
                  role="group"
                  aria-label={`Filter by type in ${activeSearchCategory}`}
                >
                  {(TYPE_CATEGORIES[activeSearchCategory] as AttractionType[]).map((type) => {
                    const icon = ICONS[type];
                    const active = selectedType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        className={`${styles.typeChip} ${active ? styles.typeChipActive : ""}`}
                        aria-pressed={active}
                        onClick={() => handleTypeToggle(type)}
                      >
                        {icon}
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
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

          {bodyState === "results" && (
            <ul className={styles.resultsList} aria-label="Search results">
              {results.map((attraction) => {
                const firstType = attraction.types?.[0] as AttractionType | undefined;
                const icon = firstType ? ICONS[firstType] : null;
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
