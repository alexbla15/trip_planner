"use client";

import { useState, useMemo, useCallback } from "react";
import { useAttractionTypes } from "./useAttractionTypes";

/**
 * Shared category/type multi-select filter state for a list of attraction-like items.
 * Computes which category/type chips are actually present in `items` (so chips reflect
 * what's filterable right now), and drops any selected type whose parent category is
 * removed — see docs/LEARNINGS.md's note on ExploreClient's original cascade behavior.
 */
export function useAttractionCategoryTypeFilter<T>(
  items: T[],
  getTypes: (item: T) => string[],
) {
  const { types, findType } = useAttractionTypes();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const presentCategories = useMemo(
    () => [...new Set(
      items.flatMap((item) =>
        getTypes(item).map((t) => findType(t)?.category).filter((c): c is string => Boolean(c))
      )
    )],
    [items, getTypes, findType],
  );

  const presentTypes = useMemo(() => {
    const nameSet = new Set(items.flatMap((item) => getTypes(item)));
    return types.filter((t) => nameSet.has(t.name));
  }, [items, getTypes, types]);

  const handleCategoriesChange = useCallback(
    (next: string[]) => {
      const removed = selectedCategories.filter((c) => !next.includes(c));
      setSelectedCategories(next);
      if (removed.length > 0) {
        setSelectedTypes((prev) => prev.filter((t) => {
          const cat = findType(t)?.category;
          return !cat || !removed.includes(cat);
        }));
      }
    },
    [selectedCategories, findType],
  );

  const matches = useCallback(
    (item: T) => {
      const itemTypes = getTypes(item);
      const matchesCategory =
        selectedCategories.length === 0 ||
        itemTypes.some((t) => {
          const cat = findType(t)?.category;
          return cat && selectedCategories.includes(cat);
        });
      const matchesType =
        selectedTypes.length === 0 || itemTypes.some((t) => selectedTypes.includes(t));
      return matchesCategory && matchesType;
    },
    [getTypes, selectedCategories, selectedTypes, findType],
  );

  const reset = useCallback(() => {
    setSelectedCategories([]);
    setSelectedTypes([]);
  }, []);

  return {
    selectedCategories,
    selectedTypes,
    setSelectedTypes,
    handleCategoriesChange,
    presentCategories,
    presentTypes,
    matches,
    reset,
  };
}
