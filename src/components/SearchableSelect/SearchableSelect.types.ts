export interface SearchableSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  /** Shows a loading indicator and "Loading…" in the dropdown instead of the option list —
   *  for options fetched asynchronously (e.g. cities from the DB). */
  loading?: boolean;
  disabled?: boolean;
  /** When true, text that doesn't match any option is still accepted as the value on
   *  blur/Enter (e.g. a brand-new city not yet in the DB). When false, only a listed
   *  option can be committed — typing something that doesn't match reverts to the last
   *  valid value on blur (e.g. country must come from the fixed list). */
  allowFreeText?: boolean;
  error?: boolean;
  ariaLabel?: string;
  ariaRequired?: boolean;
  /** id of an element (e.g. an error message) that describes this field — same
   *  purpose as a plain input's aria-describedby. */
  ariaDescribedBy?: string;
  onBlur?: () => void;
  emptyMessage?: string;
}
