"use client";

import { useMemo, useState } from "react";

/**
 * Centralizes client-side pagination math (page state, total pages, slicing)
 * so any list/table only needs one hook call instead of hand-rolling
 * `totalPages`/`paginatedItems` per component. Mirrors the math already
 * proven in TripDetailClient's attractions-list pagination.
 */
export function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const clampedPage = Math.min(page, totalPages);

  const paginatedItems = useMemo(
    () => items.slice((clampedPage - 1) * pageSize, clampedPage * pageSize),
    [items, clampedPage, pageSize]
  );

  function goToPage(next: number) {
    setPage(Math.min(Math.max(1, next), totalPages));
  }

  return { page: clampedPage, setPage, totalPages, paginatedItems, goToPage };
}
