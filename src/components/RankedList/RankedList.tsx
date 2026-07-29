"use client";

import Link from "next/link";
import { Pagination, usePagination } from "@/components/Pagination";
import { TABLE_PAGE_SIZE } from "@/config/ui";
import styles from "./RankedList.module.css";

export interface RankedListItem {
  name: string;
  count: number;
  href?: string;
  subtitle?: string;
}

interface RankedListProps {
  items: RankedListItem[];
}

export function RankedList({ items }: RankedListProps) {
  const { page, totalPages, paginatedItems, goToPage } = usePagination(items, TABLE_PAGE_SIZE);

  return (
    <>
      <ol className={styles.list}>
        {paginatedItems.map(({ name, count, href, subtitle }, i) => {
          const rank = (page - 1) * TABLE_PAGE_SIZE + i + 1;
          return (
            <li key={`${name}-${rank}`} className={styles.row}>
              <span className={styles.rank}>{rank}</span>
              <span className={styles.nameCol}>
                {href ? (
                  <Link href={href} className={styles.link}>
                    <span className={styles.name}>{name}</span>
                  </Link>
                ) : (
                  <span className={styles.name}>{name}</span>
                )}
                {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
              </span>
              <span className={styles.count}>{count.toLocaleString()}</span>
            </li>
          );
        })}
      </ol>
      <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />
    </>
  );
}
