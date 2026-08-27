"use client";

import { useState, useEffect } from "react";
import { fetchFoodStyles } from "@/services";

export interface FoodStyleRecord {
  _id: string;
  name: string;
}

interface UseFoodStylesResult {
  styles: FoodStyleRecord[];
  loading: boolean;
}

let cache: FoodStyleRecord[] | null = null;
let cachePromise: Promise<FoodStyleRecord[]> | null = null;

async function fetchStyles(): Promise<FoodStyleRecord[]> {
  if (cache) return cache;
  if (!cachePromise) {
    cachePromise = fetchFoodStyles()
      .then((data) => {
        cache = Array.isArray(data) ? (data as FoodStyleRecord[]) : [];
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

export function invalidateFoodStylesCache() {
  cache = null;
  cachePromise = null;
  subscribers.forEach((reload) => reload());
}

export function useFoodStyles(): UseFoodStylesResult {
  const [styles, setStyles] = useState<FoodStyleRecord[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    function load() {
      if (cache) { setStyles(cache); setLoading(false); return; }
      setLoading(true);
      fetchStyles().then((data) => { setStyles(data); setLoading(false); });
    }
    load();
    subscribers.add(load);
    return () => { subscribers.delete(load); };
  }, []);

  return { styles, loading };
}
