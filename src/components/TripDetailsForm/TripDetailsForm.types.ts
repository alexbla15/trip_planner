import type { RefObject } from "react";

export interface TripDetailsFormProps {
  /** Prefixes every field's DOM id (e.g. "new-trip" or "edit-trip") so two instances
   *  never collide if ever rendered on the same page. */
  idPrefix: string;

  tripName: string;
  onTripNameChange: (value: string) => void;
  /** Forwarded to the name input — lets a caller focus it programmatically (e.g. on invalid submit). */
  tripNameRef?: RefObject<HTMLInputElement | null>;

  country: string;
  onCountryChange: (value: string) => void;

  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  /** Pre-computed via `getDateError` — null when the range is valid or incomplete. */
  dateError: string | null;
  /** Pre-computed via `getDurationDays` — null until both dates are set. */
  durationDays: number | null;

  budget: string;
  onBudgetChange: (value: string) => void;
  currency: string;
  onCurrencyChange: (value: string) => void;

  moods: string[];
  onMoodToggle: (tag: string) => void;

  notes: string;
  onNotesChange: (value: string) => void;
  /** Pre-computed via `getNotesCountLevel`. */
  notesLevel: "ok" | "warn" | "error";

  touched: Record<string, boolean>;
  onBlur: (field: string) => void;
}
