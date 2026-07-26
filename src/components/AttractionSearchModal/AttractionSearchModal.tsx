"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Search, MapPin, Plus, PenLine, SearchX, Check } from "lucide-react";
import { renderTypeIcon } from "@/components/IconPicker";
import { useAttractionTypes, useDebounce } from "@/hooks";
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
  subtypeFilter,
  title = "Add Attraction",
  createLabel = "Create new attraction",
  multiSelect = false,
}: AttractionSearchModalProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const existingIdSet = useMemo(() => new Set(existingAttractionIds), [existingAttractionIds]);
  const { categories, findType } = useAttractionTypes();
  const [results, setResults] = useState<Attraction[]>([]);
  const [bodyState, setBodyState] = useState<BodyState>("initial");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedCategory(null);
      setResults([]);
      setBodyState("initial");
      setSelectedIds(new Set());
    }
  }, [isOpen]);

  // Fires only once typing pauses for 300ms, avoiding a fetch per keystroke.
  useEffect(() => {
    if (!debouncedQuery.trim()) return;
    let cancelled = false;
    (async () => {
      try {
        const data = (await searchAttractionsByCountry(country, debouncedQuery, token)) as Attraction[];
        if (cancelled) return;
        const list = (Array.isArray(data) ? data : [])
          .filter((a) => !subtypeFilter || a.subtype === subtypeFilter);
        setResults(list);
        setBodyState(list.length > 0 ? "results" : "empty");
      } catch {
        if (cancelled) return;
        setBodyState("empty");
        setResults([]);
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedQuery, country, token, subtypeFilter]);

  // Reflects typing immediately (so the UI doesn't feel stuck) while the actual
  // network request waits for the debounced value in the effect above.
  function handleQueryChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setBodyState("initial");
      setResults([]);
    } else {
      setBodyState("loading");
    }
  }

  const filteredResults = useMemo(() => {
    if (!selectedCategory) return results;
    return results.filter((a) =>
      a.types.some((t) => findType(t)?.category === selectedCategory)
    );
  }, [results, selectedCategory, findType]);

  function handleRowClick(attraction: Attraction) {
    if (existingIdSet.has(attraction._id)) return;
    if (multiSelect) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(attraction._id)) next.delete(attraction._id);
        else next.add(attraction._id);
        return next;
      });
      return;
    }
    onAdd([attraction]);
    onClose();
  }

  function handleAddSelected() {
    const toAdd = filteredResults.filter((a) => selectedIds.has(a._id));
    onAdd(toAdd);
    onClose();
  }

  function handleCreateNew() {
    onCreateNew();
    onClose();
  }

  const createNewBtn = (
    <button type="button" className={styles.createBtn} onClick={handleCreateNew}>
      <PenLine size={15} aria-hidden="true" />
      {createLabel}
    </button>
  );

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
          <h2 id={HEADING_ID} className={styles.title}>{title}</h2>
        </div>
      }
      footer={
        multiSelect ? (
          <div className={styles.footerMultiSelect}>
            {createNewBtn}
            <button
              type="button"
              className={styles.addSelectedBtn}
              onClick={handleAddSelected}
              disabled={selectedIds.size === 0}
              aria-disabled={selectedIds.size === 0}
            >
              {selectedIds.size > 0 ? `Add ${selectedIds.size} Selected` : "Add Selected"}
            </button>
          </div>
        ) : (
          createNewBtn
        )
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
          <ul
            className={styles.resultsList}
            aria-label="Search results"
            role={multiSelect ? "listbox" : undefined}
            aria-multiselectable={multiSelect ? "true" : undefined}
          >
            {filteredResults.map((attraction) => {
              const firstType = attraction.types?.[0];
              const icon = firstType ? renderTypeIcon(findType(firstType)?.icon ?? "Globe") : null;
              const isAdded = existingIdSet.has(attraction._id);
              const isSelected = multiSelect && selectedIds.has(attraction._id);
              return (
                <li key={attraction._id} role={multiSelect ? "option" : undefined} aria-selected={multiSelect ? isSelected : undefined}>
                  <button
                    type="button"
                    className={`${styles.resultRow} ${isAdded ? styles.resultRowAdded : ""} ${isSelected ? styles.resultRowSelected : ""}`}
                    onClick={() => handleRowClick(attraction)}
                    disabled={isAdded}
                    aria-pressed={multiSelect ? isSelected : undefined}
                    aria-label={`${isAdded ? "Already added: " : multiSelect ? "" : "Add "}${attraction.name}${isAdded || multiSelect ? "" : " to trip"}`}
                  >
                    {multiSelect && (
                      <div className={styles.resultCheck} aria-hidden="true">
                        {isSelected && <Check size={13} strokeWidth={3} />}
                      </div>
                    )}
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
                      !multiSelect && <Plus size={16} className={styles.resultAdd} aria-hidden="true" />
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
