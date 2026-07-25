"use client";

import { useState, useEffect } from "react";
import type { AttractionCategoryRecord } from "@/types/attractionCategory";
import { fetchAttractionCategories } from "@/services";

let cache: AttractionCategoryRecord[] | null = null;
let cachePromise: Promise<AttractionCategoryRecord[]> | null = null;

async function fetchCategories(): Promise<AttractionCategoryRecord[]> {
  if (cache !== null) return cache;
  if (!cachePromise) {
    cachePromise = fetchAttractionCategories()
      .then((data) => {
        cache = Array.isArray(data) ? (data as AttractionCategoryRecord[]) : [];
        return cache;
      })
      .catch(() => {
        cachePromise = null;
        return [];
      });
  }
  return cachePromise;
}

/** Clears the module-level attraction-categories cache so the next {@link useAttractionCategories} call refetches. Call after creating/editing/deleting a category in the admin panel. */
export function invalidateAttractionCategoriesCache() {
  cache = null;
  cachePromise = null;
}

/**
 * Attraction categories, fetched once and cached at module scope for the
 * lifetime of the page (shared across every component that calls this hook).
 * Prefer `useAttractionTypes()` instead when you only need category *names*
 * for filter chips — this hook is for when the full category record
 * (icon, color, order) is required.
 */
export function useAttractionCategories() {
  const [categories, setCategories] = useState<AttractionCategoryRecord[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    if (cache !== null) { setCategories(cache); setLoading(false); return; }
    fetchCategories().then((data) => { setCategories(data); setLoading(false); });
  }, []);

  return { categories, loading };
}
