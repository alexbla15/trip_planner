"use client";

import { useState, useEffect } from "react";
import type { AttractionCategoryRecord } from "@/types/attractionCategory";

let cache: AttractionCategoryRecord[] | null = null;
let cachePromise: Promise<AttractionCategoryRecord[]> | null = null;

async function fetchCategories(): Promise<AttractionCategoryRecord[]> {
  if (cache !== null) return cache;
  if (!cachePromise) {
    cachePromise = fetch("/api/attraction-categories")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<AttractionCategoryRecord[]>;
      })
      .then((data) => {
        cache = Array.isArray(data) ? data : [];
        return cache;
      })
      .catch(() => {
        cachePromise = null;
        return [];
      });
  }
  return cachePromise;
}

export function invalidateAttractionCategoriesCache() {
  cache = null;
  cachePromise = null;
}

export function useAttractionCategories() {
  const [categories, setCategories] = useState<AttractionCategoryRecord[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    if (cache !== null) { setCategories(cache); setLoading(false); return; }
    fetchCategories().then((data) => { setCategories(data); setLoading(false); });
  }, []);

  return { categories, loading };
}
