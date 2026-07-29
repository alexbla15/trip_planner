"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./Pagination.module.css";
import type { PaginationProps } from "./Pagination.types";

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={styles.pagination}>
      <button
        type="button"
        className={`${styles.paginationBtn} ${page === 1 ? styles.paginationBtnDisabled : ""}`}
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Go to previous page"
      >
        <ChevronLeft size={14} aria-hidden="true" />
        Previous
      </button>
      <span className={styles.paginationInfo} aria-live="polite" aria-atomic="true">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className={`${styles.paginationBtn} ${page === totalPages ? styles.paginationBtnDisabled : ""}`}
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Go to next page"
      >
        Next
        <ChevronRight size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
