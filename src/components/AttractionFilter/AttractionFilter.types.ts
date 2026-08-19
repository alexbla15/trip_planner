import type { AttractionTypeRecord } from "@/types/attractionType";

export interface AttractionFilterProps {
  /** Required unless `hideSearch` is set. */
  searchValue?: string;
  onSearchChange?: (q: string) => void;
  categories: string[];
  placeholder?: string;
  searchLabel?: string;
  /** When provided, announces the count to screen readers via an aria-live region */
  resultCount?: number;
  /** Optional ref forwarded to the search input, e.g. for programmatic focus */
  inputRef?: React.RefObject<HTMLInputElement | null>;
  /** Hides the search bar — for hosts that already provide their own search UI. */
  hideSearch?: boolean;

  /** Single-select category filter (default mode). Ignored once `onCategoriesChange` is provided. */
  selectedCategory?: string | null;
  onCategoryChange?: (cat: string | null) => void;

  /** Multi-select category filter — pass both props to opt in; takes precedence over the single-select props above. */
  selectedCategories?: string[];
  onCategoriesChange?: (cats: string[]) => void;
  /** Optional visible label above the category chip row (e.g. "Categories"). */
  categoryLabel?: string;

  /** Optional second chip row for individual attraction types. Only rendered when `onCategoriesChange` (multi-select mode) and a non-empty `types` are both provided. */
  types?: AttractionTypeRecord[];
  selectedTypes?: string[];
  onTypesChange?: (types: string[]) => void;
  /** Optional visible label above the type chip row (e.g. "Types"). */
  typeLabel?: string;

  /** Wraps the category/type chips in a foldable toggle, closed by default — same
   *  collapsing behavior and look everywhere it's used. */
  collapsible?: boolean;
  /** Label on the collapsible toggle button. */
  collapsibleLabel?: string;
}
