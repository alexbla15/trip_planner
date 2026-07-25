import type { OpeningHours } from "@/components/NewAttractionModal";
import { DEFAULT_OPENING_HOURS } from "@/components/NewAttractionModal";

export function buildInitialHours(): OpeningHours {
  return structuredClone(DEFAULT_OPENING_HOURS);
}
