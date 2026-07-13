import Link from "next/link";
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
  return (
    <ol className={styles.list}>
      {items.map(({ name, count, href, subtitle }, i) => (
        <li key={`${name}-${i}`} className={styles.row}>
          <span className={styles.rank}>{i + 1}</span>
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
      ))}
    </ol>
  );
}
