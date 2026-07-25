import type { OpeningHours } from "@/components/NewAttractionModal";
import { DEFAULT_OPENING_HOURS } from "@/components/NewAttractionModal";

/** Returns a fresh, independently-mutable copy of the default weekly opening-hours template. */
export function buildInitialHours(): OpeningHours {
  return structuredClone(DEFAULT_OPENING_HOURS);
}
