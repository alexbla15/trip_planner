"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { getIconComponent } from "@/components/IconPicker";
import { AttractionTypeChip } from "@/components/NewAttractionModal/AttractionTypeChip";
import { useAttractionTypes } from "@/hooks/useAttractionTypes";
import styles from "./AttractionTypePicker.module.css";

interface AttractionTypePickerProps {
  selectedTypes: string[];
  onToggle: (type: string) => void;
  /** aria-labelledby value for the chip group role="group" */
  labelId?: string;
  /** aria-describedby value for the chip group (e.g. an error message id) */
  errorId?: string;
}

export function AttractionTypePicker({
  selectedTypes,
  onToggle,
  labelId,
  errorId,
}: AttractionTypePickerProps) {
  const { categories, byCategory } = useAttractionTypes();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  return (
    <div className={styles.typePicker}>
      {activeCategory === null ? (
        <div className={styles.categoryChips} role="group" aria-label="Attraction categories">
          {categories.map((cat) => {
            const catTypes = byCategory[cat] ?? [];
            const selCount = catTypes.filter((t) => selectedTypes.includes(t.name)).length;
            const CatIcon = getIconComponent(catTypes[0]?.categoryIcon ?? "Globe");
            return (
              <button
                key={cat}
                type="button"
                className={`${styles.categoryChip} ${selCount > 0 ? styles.categoryChipActive : ""}`}
                onClick={() => setActiveCategory(cat)}
                aria-pressed={selCount > 0}
              >
                <CatIcon size={14} aria-hidden="true" />
                {cat}
                {selCount > 0 && (
                  <span className={styles.categoryBadge} aria-label={`${selCount} selected`}>
                    {selCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => setActiveCategory(null)}
          >
            <ChevronLeft size={13} aria-hidden="true" />
            All categories
          </button>
          <p className={styles.categoryTitle}>{activeCategory}</p>
          <div
            className={styles.chipGroup}
            role="group"
            aria-labelledby={labelId}
            aria-describedby={errorId}
          >
            {(byCategory[activeCategory] ?? []).map((typeRecord) => (
              <AttractionTypeChip
                key={typeRecord.name}
                type={typeRecord.name}
                iconName={typeRecord.icon}
                selected={selectedTypes.includes(typeRecord.name)}
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
