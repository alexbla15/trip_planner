import type { Attraction } from "@/types/attraction";

export interface AttractionGridCardProps {
  attraction: Attraction;
  onClick: (attraction: Attraction) => void;
}
