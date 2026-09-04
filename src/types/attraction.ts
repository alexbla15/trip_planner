export interface OpeningHoursRange {
  open: string;
  close: string;
}

export interface OpeningHoursDay {
  closed: boolean;
  ranges: OpeningHoursRange[];
}

export type OpeningHours = Record<string, OpeningHoursDay>;

export interface PriceTier {
  label: string;
  amount: number;
  isPrimary: boolean;
  /** Product/brand name (e.g. "Galaxy 3h", "Entrance") — used to group tiers into tabs in
   *  the detail modal. User-entered, replaces heuristic parsing. */
  product?: string;
  /** Who this tier applies to (e.g. "Adult", "Child", "Senior", "Student") — free-form so
   *  unusual venues aren't blocked, but the detail modal groups/filters distinct values
   *  it recognizes among a tier set. Absent means this tier can't be grouped by visitor
   *  type (falls into the ungrouped/flat list alongside other tiers missing it). */
  visitorType?: string;
  /** Which days/day-types this tier's rate applies to — array of individual day names
   *  ("Monday", "Tuesday", ..., "Sunday") or special values ("weekday" for Mon-Thu,
   *  "weekend" for Fri-Sun & holidays). Empty/absent means "Any day" (applies to all days). */
  days?: string[];
}

export interface Attraction {
  /** Identifies this ROW — for a regular attraction's 2nd+ scheduled instance, this is a
   *  synthetic per-instance id, not the shared document's own id (see `attractionId`). For
   *  every other case (the primary instance, an unscheduled linked attraction, a custom-slot,
   *  a flight), this is unchanged from before and equals the "real" id for that row. */
  _id: string;
  /** The shared Attraction document's real id — always present for a regular attraction
   *  (whether primary or an additional instance), absent for custom-slot/flight rows (which
   *  have no backing document). Operations on the shared data itself (full edit/save) must
   *  use this field, not `_id`, once more than one instance can exist. */
  attractionId?: string;
  /** Whether the CURRENT user has personally marked this attraction visited — private,
   *  per-user, independent of any trip. Always false for custom-slot/flight rows (no
   *  backing document) and for anonymous callers. */
  isVisited?: boolean;
  /** Names of the CURRENT user's own trips that already include this attraction — private,
   *  per-user, independent of the trip context (if any) the card is being viewed from.
   *  Empty/absent for custom-slot/flight rows and for anonymous callers. */
  usedInTripNames?: string[];
  /** The shared Attraction document this one is nested inside (e.g. a restaurant inside a
   *  mall) — one level of nesting only, a child can never itself be a parent. `null`/absent
   *  means this attraction isn't nested inside anything. When set, `coordinates`/`city`/
   *  `country` are inherited from the parent, not independently editable. */
  parentAttractionId?: string | null;
  /** The parent's name — set only when `parentAttractionId` is set, resolved server-side
   *  so consumers can render "Part of {name}" without a second lookup. */
  parentAttractionName?: string;
  /** The parent's photo — set only when `parentAttractionId` is set AND the parent has a
   *  photo. UI falls back to this when the child has no photoUrl of its own (a nested
   *  attraction, e.g. a specific ride inside a theme park, often has no dedicated photo). */
  parentAttractionPhotoUrl?: string;
  /** How many other attractions are nested inside this one. 0 for a child (nesting is one
   *  level only) or a leaf attraction with no children. */
  childAttractionCount?: number;
  // no tripId — attractions are global; scheduling lives in Trip.schedules
  ownerId?: string;
  name: string;
  country: string;
  /** Required for all subtypes except "flight" — flights don't have a single city. */
  city?: string;
  coordinates?: { lat: number; lng: number } | null;
  types: string[];
  /** Only meaningful for dining-type attractions — admin-managed food style names. */
  foodStyles?: string[];
  durationValue?: string;
  durationUnit?: "minutes" | "hours";
  price?: number | null;
  /** Named price tiers — always non-empty (a document with no explicit tiers gets a
   *  single synthesized "Regular" tier equal to `price`). See `IPriceTier` on the model
   *  for the full contract. */
  prices?: PriceTier[];
  /** How many of each `prices` tier the user selected for THIS scheduled instance of the
   *  trip (e.g. 3x "Adult", 1x "Child") — per-trip, so it's a schedule-entry field, not a
   *  shared-document one. Empty means no explicit choice yet (the Costs tab defaults to
   *  1x the primary tier). */
  priceTierQuantities?: { label: string; quantity: number }[];
  currency?: string;
  openingHours?: OpeningHours;
  /** Months (1–12) this attraction is open in. Absent/empty means open year-round —
   *  never persisted for the common case, only when it's genuinely seasonal. */
  openingMonths?: number[];
  /** Date-scoped hours overrides — e.g. different hours in summer vs. winter. Each entry
   *  has its own full weekly `hours` grid plus a `start`/`end` (month/day, no year — recurs
   *  annually) window it applies to. `openingHours` above is still the base/default
   *  schedule used for any date that doesn't fall inside one of these ranges (or when this
   *  is empty/absent — the common, non-seasonal case). */
  seasonalHours?: { title?: string; start: { month: number; day: number }; end: { month: number; day: number }; hours: OpeningHours }[];
  notes?: string;
  photoUrl?: string;
  /** Official venue website — user-editable, separate from photoUrl. */
  websiteUrl?: string;
  /** Admin-curated "verified" mark — only an admin can set this (see PUT /api/attractions/:id). */
  verified?: boolean;
  plannedDate?: string | null;
  plannedTime?: string | null;  // "HH:MM", e.g. "09:00"
  actualDurationValue?: string;
  actualDurationUnit?: "minutes" | "hours";
  createdAt?: string;
  updatedAt?: string;
  // ── Subtype discriminator ──────────────────────────────────────────────────
  subtype?: "residence" | "flight" | "custom-slot";
  // Residence-specific fields
  residenceType?: "Hotel" | "Apartment" | "Hostel" | "Villa" | "Other";
  checkInDate?: string;   // "YYYY-MM-DD"
  checkOutDate?: string;  // "YYYY-MM-DD"
  // Flight-specific fields
  flightNumber?: string;
  airline?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureTime?: string;  // ISO datetime "YYYY-MM-DDTHH:MM"
  arrivalTime?: string;    // ISO datetime (may be next day)
  gate?: string;
  seat?: string;
}
