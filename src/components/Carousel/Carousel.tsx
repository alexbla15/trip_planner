"use client";

import { useRef, useState, useEffect, useCallback, Children } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getScrollBoundaries, prefersReducedMotion } from "./Carousel.utils";
import type { CarouselProps } from "./Carousel.types";
import styles from "./Carousel.module.css";

export function Carousel({ children, ariaLabel }: CarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateBoundaries = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { canScrollPrev: prev, canScrollNext: next } = getScrollBoundaries(el);
    setCanScrollPrev(prev);
    setCanScrollNext(next);
  }, []);

  useEffect(() => {
    updateBoundaries();
    const el = trackRef.current;
    if (!el) return;
    const resizeObserver = new ResizeObserver(updateBoundaries);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [updateBoundaries, children]);

  function scrollByOneCard(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    const firstCard = el.firstElementChild as HTMLElement | null;
    if (!firstCard) return;
    const gap = parseFloat(getComputedStyle(el).columnGap || "0");
    const distance = firstCard.getBoundingClientRect().width + gap;
    el.scrollBy({ left: direction * distance, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  const hasMultipleItems = Children.count(children) > 1;

  return (
    <div className={styles.wrapper}>
      <div
        ref={trackRef}
        className={styles.track}
        role="region"
        aria-label={ariaLabel}
        onScroll={updateBoundaries}
      >
        {children}
      </div>

      {hasMultipleItems && (
        <>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowPrev}`}
            onClick={() => scrollByOneCard(-1)}
            disabled={!canScrollPrev}
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowNext}`}
            onClick={() => scrollByOneCard(1)}
            disabled={!canScrollNext}
            aria-label="Scroll right"
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}
