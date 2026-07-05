export interface Attraction {
  _id: string;
  // no tripId — attractions are global; scheduling lives in Trip.schedules
  ownerId?: string;
  name: string;
  country: string;
  city: string;
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
  subtype?: "residence" | "flight";
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
