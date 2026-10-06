"use client";

import { useState, useEffect } from "react";
import { fetchBrands } from "@/services";

export interface BrandRecord {
  _id: string;
  name: string;
  photoUrl?: string;
  websiteUrl?: string;
  types: string[];
}

interface UseBrandsResult {
  brands: BrandRecord[];
  loading: boolean;
}

let cache: BrandRecord[] | null = null;
let cachePromise: Promise<BrandRecord[]> | null = null;

async function fetchAll(): Promise<BrandRecord[]> {
  if (cache) return cache;
  if (!cachePromise) {
    cachePromise = fetchBrands()
      .then((data) => {
        cache = Array.isArray(data) ? (data as BrandRecord[]) : [];
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

export function invalidateBrandsCache() {
  cache = null;
  cachePromise = null;
  subscribers.forEach((reload) => reload());
}

export function useBrands(): UseBrandsResult {
  const [brands, setBrands] = useState<BrandRecord[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    function load() {
      if (cache) { setBrands(cache); setLoading(false); return; }
      setLoading(true);
      fetchAll().then((data) => { setBrands(data); setLoading(false); });
    }
    load();
    subscribers.add(load);
    return () => { subscribers.delete(load); };
  }, []);

  return { brands, loading };
}
