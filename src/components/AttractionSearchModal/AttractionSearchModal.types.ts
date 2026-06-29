import type { Attraction } from "@/types/attraction";

export interface AttractionSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  country: string;
  onAdd: (attraction: Attraction) => void;
  onCreateNew: () => void;
}
