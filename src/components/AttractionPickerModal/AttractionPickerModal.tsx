"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Search, Plus, MapPin, ChevronDown, AlertCircle } from "lucide-react";
import { useGlobalAttractions } from "@/contexts/AttractionsContext";
import { NewAttractionModal } from "@/components/NewAttractionModal/NewAttractionModal";
import { ICONS } from "@/components/NewAttractionModal/AttractionTypeChip";
import type { AttractionFormData } from "@/components/NewAttractionModal/attraction.types";
import { COUNTRIES } from "@/components/NewAttractionModal/attraction.constants";
import styles from "./AttractionPickerModal.module.css";

const HEADING_ID = "attraction-picker-title";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

interface AttractionPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (attractions: AttractionFormData[]) => void;
  alreadyAdded?: AttractionFormData[];
}

export function AttractionPickerModal({
  isOpen,
  onClose,
  onAdd,
  alreadyAdded = [],
}: AttractionPickerModalProps) {
  const { globalAttractions, addGlobalAttraction } = useGlobalAttractions();

  const [countryFilter, setCountryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [newAttractionOpen, setNewAttractionOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen) {
      setCountryFilter("");
      setCityFilter("");
      setSelectedIndices(new Set());
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen || newAttractionOpen) return;
      if (e.key === "Escape") { onClose(); return; }
    },
    [isOpen, newAttractionOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Derive a unique key for each global attraction (name+country+city) to detect already-added ones
  const alreadyAddedKeys = new Set(
    alreadyAdded.map((a) => `${a.name}|${a.country}|${a.city}`)
  );

  const filteredWithIndex = globalAttractions
    .map((a, i) => ({ attraction: a, index: i }))
    .filter(({ attraction: a }) => {
      const matchesCountry = !countryFilter || a.country === countryFilter;
      const matchesCity =
        !cityFilter ||
        (a.city ?? "").toLowerCase().includes(cityFilter.toLowerCase());
      return matchesCountry && matchesCity;
    });

  function toggleSelect(index: number) {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function handleAddSelected() {
    const toAdd = [...selectedIndices].map((i) => globalAttractions[i]);
    onAdd(toAdd);
    onClose();
  }

  function handleNewAttractionSave(data: AttractionFormData) {
    const newIndex = globalAttractions.length;
    addGlobalAttraction(data);
    setSelectedIndices((prev) => new Set([...prev, newIndex]));
    setNewAttractionOpen(false);
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  const selectedCount = selectedIndices.size;

  if (!mounted || !isOpen) return null;

  const modal = (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      aria-hidden="true"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={HEADING_ID}
        className={styles.container}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.header}>
          <h2 id={HEADING_ID} className={styles.title}>
            <MapPin size={18} className={styles.titleIcon} aria-hidden="true" />
            Add Attractions
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close picker"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.filterSelectWrapper}>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className={styles.filterSelect}
              aria-label="Filter by country"
            >
              <option value="">All countries</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown size={14} className={styles.filterSelectIcon} aria-hidden="true" />
          </div>

          <div className={styles.filterSearchWrapper}>
            <Search size={14} className={styles.filterSearchIcon} aria-hidden="true" />
            <input
              type="text"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="Filter by city…"
              className={styles.filterSearchInput}
              aria-label="Filter by city"
            />
          </div>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {globalAttractions.length === 0 ? (
            <div className={styles.emptyState}>
              <AlertCircle size={32} className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyHeading}>No saved attractions yet</p>
              <p className={styles.emptyBody}>
                Create your first attraction using the button below.
              </p>
            </div>
          ) : filteredWithIndex.length === 0 ? (
            <div className={styles.emptyState}>
              <Search size={28} className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyHeading}>No matches</p>
              <p className={styles.emptyBody}>Try adjusting the country or city filter.</p>
            </div>
          ) : (
            <ul className={styles.list} role="listbox" aria-multiselectable="true" aria-label="Saved attractions">
              {filteredWithIndex.map(({ attraction: a, index }) => {
                const isSelected = selectedIndices.has(index);
                const isAlreadyAdded = alreadyAddedKeys.has(`${a.name}|${a.country}|${a.city}`);
                const firstType = a.types[0];
                const icon = firstType ? ICONS[firstType] : null;

                return (
                  <li key={index} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      className={`${styles.item} ${isSelected ? styles.itemSelected : ""} ${isAlreadyAdded ? styles.itemAdded : ""}`}
                      onClick={() => !isAlreadyAdded && toggleSelect(index)}
                      aria-pressed={isSelected}
                      aria-label={`${isAlreadyAdded ? "Already added: " : ""}${a.name}`}
                      disabled={isAlreadyAdded}
                    >
                      <div className={styles.itemCheck}>
                        {isSelected && !isAlreadyAdded && (
                          <span className={styles.checkMark} aria-hidden="true">✓</span>
                        )}
                        {isAlreadyAdded && (
                          <span className={styles.addedMark} aria-hidden="true">✓</span>
                        )}
                      </div>
                      <div className={styles.itemIconCircle} aria-hidden="true">
                        {icon}
                      </div>
                      <div className={styles.itemInfo}>
                        <span className={styles.itemName}>{a.name}</span>
                        <span className={styles.itemMeta}>
                          {a.types.join(", ")}
                          {a.country ? ` · ${a.country}` : ""}
                          {a.city ? `, ${a.city}` : ""}
                        </span>
                      </div>
                      {isAlreadyAdded && (
                        <span className={styles.addedTag}>Added</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.createBtn}
            onClick={() => setNewAttractionOpen(true)}
          >
            <Plus size={15} aria-hidden="true" />
            Create New Attraction
          </button>

          <div className={styles.footerActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              <X size={15} aria-hidden="true" />
              Cancel
            </button>
            <button
              type="button"
              className={styles.addBtn}
              onClick={handleAddSelected}
              disabled={selectedCount === 0}
              aria-disabled={selectedCount === 0}
            >
              {selectedCount > 0 ? `Add ${selectedCount} Selected` : "Add Selected"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(modal, document.body)}
      <NewAttractionModal
        isOpen={newAttractionOpen}
        onClose={() => setNewAttractionOpen(false)}
        onSave={handleNewAttractionSave}
      />
    </>
  );
}
