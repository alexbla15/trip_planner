import type { Attraction } from "@/types/attraction";

/** Props for the modal that searches existing attractions in a country and lets the user add one to the trip, or fall through to creating a new one. */
export interface AttractionSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  country: string;
  /** Always receives an array — length 1 unless `multiSelect` is enabled. */
  onAdd: (attractions: Attraction[]) => void;
  onCreateNew: () => void;
  /** Enables checkbox-style multi-select with a batched "Add N Selected" footer action, instead of adding on first click. Default false. */
  multiSelect?: boolean;
  /** Caller's auth token — forwarded to the search request so private-trip attractions the user can access aren't hidden. */
  token?: string | null;
  /** IDs of attractions already in the trip — matching results render disabled with an "Added" indicator instead of being addable again. */
  existingAttractionIds?: string[];
  /** Restrict results to one attraction subtype (e.g. "residence" for the "pick existing residence" flow). Omit to search all subtypes. */
  subtypeFilter?: "residence";
  /** Header title. Defaults to "Add Attraction". */
  title?: string;
  /** Footer/empty-state fallback button label. Defaults to "Create new attraction". */
  createLabel?: string;
}
