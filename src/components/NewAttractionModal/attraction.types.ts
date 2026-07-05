export type AttractionType =
  | "Restaurant"
  | "Bar"
  | "Café"
  | "Supermarket"
  | "Food Truck"
  | "Museum"
  | "Gallery"
  | "Theatre"
  | "Religious"
  | "Landmark"
  | "Park"
  | "Beach"
  | "Zoo"
  | "Hiking"
  | "Cinema"
  | "Concert"
  | "Casino"
  | "Amusement Park"
  | "Water Park"
  | "Escape Room"
  | "Stand-Up Comedy"
  | "Nightclub"
  | "Mall"
  | "Store"
  | "Market"
  | "Spa"
  | "Gym"
  | "Pool"
  | "Flight"
  | "Train"
  | "Car Rental"
  | "Cruise / Port"
  | "Bus"
  | "Taxi / Rideshare"
  | "Hotel"
  | "Apartment"
  | "Hostel"
  | "Villa";

export type DurationUnit = "minutes" | "hours";

export type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface OpeningHoursDay {
  closed: boolean;
  open: string;
  close: string;
}

export type OpeningHours = Record<DayKey, OpeningHoursDay>;

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface AttractionFormData {
  name: string;
  country: string;
  city: string;
  coordinates: Coordinates | null;
  types: string[];
  durationValue: string;
  durationUnit: DurationUnit;
  price: number | null;
  currency: string;
  openingHours: OpeningHours;
  notes: string;
  photoUrl: string;
}

export interface NewAttractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AttractionFormData) => void;
  /** When provided, the country field is pre-filled and locked to this value. */
  defaultCountry?: string;
  /** When provided, the modal enters edit mode — all fields pre-filled, title changes to "Edit Attraction". */
  initialData?: AttractionFormData;
}
