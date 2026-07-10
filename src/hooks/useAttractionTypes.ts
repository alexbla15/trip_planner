"use client";

import { useState, useEffect, useMemo } from "react";
import type { AttractionTypeRecord } from "@/types/attractionType";

interface UseAttractionTypesResult {
  types: AttractionTypeRecord[];
  loading: boolean;
  /** All unique category names in display order. */
  categories: string[];
  /** Types grouped by category, in display order. */
  byCategory: Record<string, AttractionTypeRecord[]>;
  /** Hex color for a given type name. Falls back to #64748B. */
  colorForType: (typeName: string) => string;
  /** Hex color for a given category name. Falls back to #64748B. */
  colorForCategory: (category: string) => string;
  /** Look up a full record by type name. */
  findType: (typeName: string) => AttractionTypeRecord | undefined;
}

// null = never fetched successfully; [] = fetched, zero results (valid empty state)
let cache: AttractionTypeRecord[] | null = null;
let cachePromise: Promise<AttractionTypeRecord[]> | null = null;

async function fetchTypes(): Promise<AttractionTypeRecord[]> {
  if (cache !== null) return cache;
  if (!cachePromise) {
    cachePromise = fetch("/api/attraction-types")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<AttractionTypeRecord[]>;
      })
      .then((data) => {
        cache = Array.isArray(data) ? data : [];
        return cache;
      })
      .catch(() => {
        cachePromise = null; // allow retry on next render
        return [];           // return empty for this request only; cache stays null
      });
  }
  return cachePromise;
}

/** Invalidates the in-memory cache so the next render re-fetches. */
export function invalidateAttractionTypesCache() {
  cache = null;
  cachePromise = null;
}

export function useAttractionTypes(): UseAttractionTypesResult {
  const [types, setTypes] = useState<AttractionTypeRecord[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    if (cache !== null) { setTypes(cache); setLoading(false); return; }
    fetchTypes().then((data) => { setTypes(data); setLoading(false); });
  }, []);

  const { categories, byCategory } = useMemo(() => {
    const map: Record<string, AttractionTypeRecord[]> = {};
    const seen = new Set<string>();
    const order: string[] = [];
    for (const t of types) {
      if (!seen.has(t.category)) { seen.add(t.category); order.push(t.category); }
      (map[t.category] ??= []).push(t);
    }
    return { categories: order, byCategory: map };
  }, [types]);

  const typeMap = useMemo(() => new Map(types.map((t) => [t.name, t])), [types]);

  function colorForType(typeName: string): string {
    return typeMap.get(typeName)?.color ?? "#64748B";
  }

  function colorForCategory(category: string): string {
    return byCategory[category]?.[0]?.color ?? "#64748B";
  }

  function findType(typeName: string): AttractionTypeRecord | undefined {
    return typeMap.get(typeName);
  }

  return { types, loading, categories, byCategory, colorForType, colorForCategory, findType };
}
