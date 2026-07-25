import { Spinner } from "@/components/Spinner";
import styles from "./RouteLoading.module.css";

export interface RouteLoadingProps {
  /** Accessible label announced while the route segment is loading. */
  label?: string;
}

/** Shared full-segment loading state, rendered by every route's `loading.tsx`. */
export function RouteLoading({ label = "Loading…" }: RouteLoadingProps) {
  return (
    <div className={styles.wrapper}>
      <Spinner size="lg" aria-label={label} />
    </div>
  );
}
