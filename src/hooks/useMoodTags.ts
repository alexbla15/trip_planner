"use client";

import { useState, useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
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

/**
 * Builds the CSS custom-property object that drives MoodTagChip / MoodTagButton colours.
 * Kept here so both components share one source of truth instead of duplicating the
 * fallback logic. Pass the result directly to the element's `style` prop.
 */
export function getMoodTagStyle(record: MoodTagRecord | undefined): CSSProperties {
  return {
    "--tag-color":      record?.color       ?? "#888",
    "--tag-bg":         record?.bgColor     ?? "#f5f5f5",
    "--tag-dark-color": record?.darkColor   ?? record?.color   ?? "#888",
    "--tag-dark-bg":    record?.darkBgColor ?? record?.bgColor ?? "#f5f5f5",
  } as CSSProperties;
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
