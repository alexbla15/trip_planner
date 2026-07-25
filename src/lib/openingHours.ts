import type { OpeningHours } from "@/components/NewAttractionModal/attraction.types";
import { DEFAULT_OPENING_HOURS } from "@/components/NewAttractionModal/attraction.constants";

export function buildInitialHours(): OpeningHours {
  return structuredClone(DEFAULT_OPENING_HOURS);
}
