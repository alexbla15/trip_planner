"use client";

import { useState, useEffect } from "react";
import { fetchShopStyles } from "@/services";

export interface ShopStyleRecord {
  _id: string;
  name: string;
  icon: string;
}

interface UseShopStylesResult {
  styles: ShopStyleRecord[];
  loading: boolean;
}

let cache: ShopStyleRecord[] | null = null;
let cachePromise: Promise<ShopStyleRecord[]> | null = null;

async function fetchStyles(): Promise<ShopStyleRecord[]> {
  if (cache) return cache;
  if (!cachePromise) {
    cachePromise = fetchShopStyles()
      .then((data) => {
        cache = Array.isArray(data) ? (data as ShopStyleRecord[]) : [];
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

export function invalidateShopStylesCache() {
  cache = null;
  cachePromise = null;
  subscribers.forEach((reload) => reload());
}

export function useShopStyles(): UseShopStylesResult {
  const [styles, setStyles] = useState<ShopStyleRecord[]>(cache ?? []);
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
