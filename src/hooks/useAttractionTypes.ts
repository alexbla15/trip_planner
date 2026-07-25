"use client";

import { useState, useEffect, useMemo } from "react";
import type { AttractionTypeRecord } from "@/types/attractionType";
import { fetchAttractionTypes } from "@/services";

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
    cachePromise = fetchAttractionTypes()
      .then((data) => {
        cache = Array.isArray(data) ? (data as AttractionTypeRecord[]) : [];
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
    for (const t of types) {
      (map[t.category] ??= []).push(t);
    }
    // Types already arrive name-sorted from the API, so each byCategory group stays
    // alphabetical; the category names themselves need their own explicit sort.
    const order = Object.keys(map).sort((a, b) => a.localeCompare(b));
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
