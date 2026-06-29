export interface Attraction {
  _id: string;
  tripId: string;
  ownerId?: string;
  name: string;
  country: string;
  city: string;
  coordinates?: { lat: number; lng: number } | null;
  types: string[];
  durationValue?: string;
  durationUnit?: "minutes" | "hours";
  price?: number | null;
  openingHours?: Record<string, { closed: boolean; open: string; close: string }>;
  createdAt?: string;
  updatedAt?: string;
}
