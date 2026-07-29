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

const subscribers = new Set<() => void>();

/** Clears the module-level attraction-categories cache and asks every mounted {@link useAttractionCategories} instance to re-fetch. Call after creating/editing/deleting a category in the admin panel. */
export function invalidateAttractionCategoriesCache() {
  cache = null;
  cachePromise = null;
  subscribers.forEach((reload) => reload());
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
    function load() {
      if (cache !== null) { setCategories(cache); setLoading(false); return; }
      setLoading(true);
      fetchCategories().then((data) => { setCategories(data); setLoading(false); });
    }
    load();
    subscribers.add(load);
    return () => { subscribers.delete(load); };
  }, []);

  return { categories, loading };
}
