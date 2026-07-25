import type { ReactNode } from "react";

/** A horizontal-scroll row with snap points and arrow navigation — reusable for any row of cards that should never wrap. */
export interface CarouselProps {
  children: ReactNode;
  ariaLabel: string;
}
