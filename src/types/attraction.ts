export interface OpeningHoursRange {
  open: string;
  close: string;
}

export interface OpeningHoursDay {
  closed: boolean;
  ranges: OpeningHoursRange[];
}

export type OpeningHours = Record<string, OpeningHoursDay>;

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
  durationValue?: string;
  durationUnit?: "minutes" | "hours";
  price?: number | null;
  currency?: string;
  openingHours?: OpeningHours;
  /** Months (1–12) this attraction is open in. Absent/empty means open year-round —
   *  never persisted for the common case, only when it's genuinely seasonal. */
  openingMonths?: number[];
  notes?: string;
  photoUrl?: string;
  /** Official venue website — user-editable, separate from photoUrl. */
  websiteUrl?: string;
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
