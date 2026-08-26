"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, MapPin, SearchX, X } from "lucide-react";
import { renderTypeIcon } from "@/components/IconPicker";
import { AttractionDetailModal } from "@/components/AttractionDetailModal";
import { Pagination } from "@/components/Pagination";
import { useAttractionTypes } from "@/hooks";
import { searchAttractionsByType } from "@/services";
import { TABLE_PAGE_SIZE } from "@/config/ui";
import type { Attraction } from "@/types/attraction";
import type { CategoryAttractionsPanelProps } from "./CategoryAttractionsPanel.types";
import styles from "./CategoryAttractionsPanel.module.css";

type BodyState = "loading" | "results" | "empty";

export function CategoryAttractionsPanel({
  onClose,
  typeName,
  ownerId,
  token,
}: CategoryAttractionsPanelProps) {
  const { findType } = useAttractionTypes();
  const [results, setResults] = useState<Attraction[]>([]);
  const [bodyState, setBodyState] = useState<BodyState>("loading");
  const [viewingAttraction, setViewingAttraction] = useState<Attraction | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setBodyState("loading");
    setResults([]);
    setQuery("");
    setPage(1);
    searchAttractionsByType(typeName, ownerId, token)
      .then((data) => {
        const list = Array.isArray(data) ? (data as Attraction[]) : [];
        setResults(list);
        setBodyState(list.length > 0 ? "results" : "empty");
      })
      .catch(() => {
        setResults([]);
        setBodyState("empty");
      });
  }, [typeName, ownerId, token]);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    return results
      .filter((a) => !q || a.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [results, query]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / TABLE_PAGE_SIZE));
  const pagedResults = filteredSorted.slice((page - 1) * TABLE_PAGE_SIZE, page * TABLE_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const icon = renderTypeIcon(findType(typeName)?.icon ?? "Globe");

  return (
    <div className={styles.panel} aria-live="polite" aria-label={`${typeName} attractions`}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <span className={styles.headerIcon} aria-hidden="true">{icon}</span>
          <h3 className={styles.title}>{typeName}</h3>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label={`Close ${typeName} list`}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {bodyState !== "loading" && results.length > 0 && (
        <div className={styles.searchBar}>
          <Search size={15} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            className={styles.searchInput}
            placeholder={`Search ${typeName.toLowerCase()} attractions…`}
            aria-label={`Search ${typeName} attractions`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      <div className={styles.body}>
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

        {bodyState === "results" && pagedResults.length > 0 && (
          <ul className={styles.resultsList} aria-label={`${typeName} attractions`}>
            {pagedResults.map((attraction) => (
              <li key={attraction._id}>
                <button
                  type="button"
                  className={styles.resultRow}
                  onClick={() => setViewingAttraction(attraction)}
                  aria-label={`View ${attraction.name}`}
                >
                  <div className={styles.resultIcon} aria-hidden="true">
                    {icon ?? <MapPin size={15} />}
                  </div>
                  <div className={styles.resultInfo}>
                    <span className={styles.resultName}>{attraction.name}</span>
                    <span className={styles.resultMeta}>
                      {[attraction.city, attraction.country].filter(Boolean).join(", ")}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {bodyState === "results" && pagedResults.length === 0 && (
          <div className={styles.placeholder}>
            <SearchX size={32} className={styles.placeholderIcon} aria-hidden="true" />
            <p className={styles.placeholderText}>No matches for &quot;{query}&quot;.</p>
          </div>
        )}

        {bodyState === "empty" && (
          <div className={styles.placeholder}>
            <SearchX size={32} className={styles.placeholderIcon} aria-hidden="true" />
            <p className={styles.placeholderText}>No {typeName} attractions found.</p>
          </div>
        )}
      </div>

      {bodyState === "results" && filteredSorted.length > 0 && (
        <div className={styles.paginationWrap}>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <AttractionDetailModal
        attraction={viewingAttraction}
        onClose={() => setViewingAttraction(null)}
        onNavigateToAttraction={setViewingAttraction}
      />
    </div>
  );
}
