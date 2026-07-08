"use client";

import { useState, useEffect, useMemo } from "react";
import type { MoodTagRecord } from "@/types/moodTag";

interface UseMoodTagsResult {
  tags: MoodTagRecord[];
  loading: boolean;
  tagByName: (name: string) => MoodTagRecord | undefined;
}

let cache: MoodTagRecord[] | null = null;
let cachePromise: Promise<MoodTagRecord[]> | null = null;

async function fetchTags(): Promise<MoodTagRecord[]> {
  if (cache) return cache;
  if (!cachePromise) {
    cachePromise = fetch("/api/mood-tags")
      .then((r) => r.json() as Promise<MoodTagRecord[]>)
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

export function invalidateMoodTagsCache() {
  cache = null;
  cachePromise = null;
}

export function useMoodTags(): UseMoodTagsResult {
  const [tags, setTags] = useState<MoodTagRecord[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) { setTags(cache); setLoading(false); return; }
    fetchTags().then((data) => { setTags(data); setLoading(false); });
  }, []);

  const tagMap = useMemo(() => new Map(tags.map((t) => [t.name, t])), [tags]);

  function tagByName(name: string): MoodTagRecord | undefined {
    return tagMap.get(name);
  }

  return { tags, loading, tagByName };
}
