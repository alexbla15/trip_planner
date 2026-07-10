export interface AttractionFilterProps {
  searchValue: string;
  onSearchChange: (q: string) => void;
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (cat: string | null) => void;
  placeholder?: string;
  searchLabel?: string;
  /** When provided, announces the count to screen readers via an aria-live region */
  resultCount?: number;
  /** Optional ref forwarded to the search input, e.g. for programmatic focus */
  inputRef?: React.RefObject<HTMLInputElement | null>;
}
