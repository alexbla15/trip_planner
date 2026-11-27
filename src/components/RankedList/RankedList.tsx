"use client";

import Link from "next/link";
import { CountryFlag } from "@/components/CountryFlag";
import { Pagination, usePagination } from "@/components/Pagination";
import { TABLE_PAGE_SIZE } from "@/config/ui";
import styles from "./RankedList.module.css";

export interface RankedListItem {
  name: string;
  count: number;
  href?: string;
  subtitle?: string;
  /** True when `name` is a country name, so it gets a flag. */
  nameIsCountry?: boolean;
  /** True when `subtitle` is a country name, so it gets a flag. */
  subtitleIsCountry?: boolean;
}

interface RankedListProps {
  items: RankedListItem[];
}

export function RankedList({ items }: RankedListProps) {
  const { page, totalPages, paginatedItems, goToPage } = usePagination(items, TABLE_PAGE_SIZE);

  return (
    <>
      <ol className={styles.list}>
        {paginatedItems.map(({ name, count, href, subtitle, nameIsCountry, subtitleIsCountry }, i) => {
          const rank = (page - 1) * TABLE_PAGE_SIZE + i + 1;
          return (
            <li key={`${name}-${rank}`} className={styles.row}>
              <span className={styles.rank}>{rank}</span>
              <span className={styles.nameCol}>
                {href ? (
                  <Link href={href} className={styles.link}>
                    <span className={styles.name}>
                      {nameIsCountry && <CountryFlag country={name} className={styles.inlineFlag} />}
                      {name}
                    </span>
                  </Link>
                ) : (
                  <span className={styles.name}>
                    {nameIsCountry && <CountryFlag country={name} className={styles.inlineFlag} />}
                    {name}
                  </span>
                )}
                {subtitle && (
                  <span className={styles.subtitle}>
                    {subtitleIsCountry && <CountryFlag country={subtitle} className={styles.inlineFlag} />}
                    {subtitle}
                  </span>
                )}
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
