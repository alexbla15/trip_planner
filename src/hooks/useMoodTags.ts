"use client";

import { useState, useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
import type { MoodTagRecord } from "@/types/moodTag";
import { fetchMoodTags } from "@/services";

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
    cachePromise = fetchMoodTags()
      .then((data) => {
        cache = Array.isArray(data) ? (data as MoodTagRecord[]) : [];
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

const subscribers = new Set<() => void>();

export function invalidateMoodTagsCache() {
  cache = null;
  cachePromise = null;
  subscribers.forEach((reload) => reload());
}

export function useMoodTags(): UseMoodTagsResult {
  const [tags, setTags] = useState<MoodTagRecord[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    function load() {
      if (cache) { setTags(cache); setLoading(false); return; }
      setLoading(true);
      fetchTags().then((data) => { setTags(data); setLoading(false); });
    }
    load();
    subscribers.add(load);
    return () => { subscribers.delete(load); };
  }, []);

  const tagMap = useMemo(() => new Map(tags.map((t) => [t.name, t])), [tags]);

  function tagByName(name: string): MoodTagRecord | undefined {
    return tagMap.get(name);
  }

  return { tags, loading, tagByName };
}
