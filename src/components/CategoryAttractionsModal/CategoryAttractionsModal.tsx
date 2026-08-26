"use client";

import { useState, useEffect } from "react";
import { MapPin, SearchX } from "lucide-react";
import { renderTypeIcon } from "@/components/IconPicker";
import { AttractionDetailModal } from "@/components/AttractionDetailModal";
import { useAttractionTypes } from "@/hooks";
import { searchAttractionsByType } from "@/services";
import { ModalShell } from "@/components/Modal";
import type { Attraction } from "@/types/attraction";
import type { CategoryAttractionsModalProps } from "./CategoryAttractionsModal.types";
import styles from "./CategoryAttractionsModal.module.css";

const HEADING_ID = "category-attractions-modal-title";

type BodyState = "loading" | "results" | "empty";

export function CategoryAttractionsModal({
  isOpen,
  onClose,
  typeName,
  ownerId,
  token,
}: CategoryAttractionsModalProps) {
  const { findType } = useAttractionTypes();
  const [results, setResults] = useState<Attraction[]>([]);
  const [bodyState, setBodyState] = useState<BodyState>("loading");
  const [viewingAttraction, setViewingAttraction] = useState<Attraction | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setBodyState("loading");
    setResults([]);
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
  }, [isOpen, typeName, ownerId, token]);

  const icon = renderTypeIcon(findType(typeName)?.icon ?? "Globe");

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      styles={styles}
      headingId={HEADING_ID}
      header={
        <div className={styles.headerTitle}>
          <span className={styles.headerIcon} aria-hidden="true">{icon}</span>
          <h2 id={HEADING_ID} className={styles.title}>{typeName}</h2>
        </div>
      }
    >
      <div aria-live="polite" aria-atomic="false">
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
          <ul className={styles.resultsList} aria-label={`${typeName} attractions`}>
            {results.map((attraction) => (
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

        {bodyState === "empty" && (
          <div className={styles.placeholder}>
            <SearchX size={36} className={styles.placeholderIcon} aria-hidden="true" />
            <p className={styles.placeholderText}>No {typeName} attractions found.</p>
          </div>
        )}
      </div>

      <AttractionDetailModal
        attraction={viewingAttraction}
        onClose={() => setViewingAttraction(null)}
        onNavigateToAttraction={setViewingAttraction}
      />
    </ModalShell>
  );
}
