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
  openingHours?: Record<string, { closed: boolean; open: string; close: string }>;
  notes?: string;
  photoUrl?: string;
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
