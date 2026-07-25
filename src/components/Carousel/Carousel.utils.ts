/** 1px tolerance for floating-point scroll position comparisons. */
const EDGE_TOLERANCE = 1;

export function getScrollBoundaries(el: HTMLElement): { canScrollPrev: boolean; canScrollNext: boolean } {
  return {
    canScrollPrev: el.scrollLeft > EDGE_TOLERANCE,
    canScrollNext: el.scrollLeft < el.scrollWidth - el.clientWidth - EDGE_TOLERANCE,
  };
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
