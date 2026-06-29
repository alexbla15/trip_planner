export type AttractionType =
  | "Restaurant"
  | "Bar"
  | "Café"
  | "Museum"
  | "Gallery"
  | "Park"
  | "Beach"
  | "Landmark"
  | "Shopping"
  | "Nightclub"
  | "Theatre"
  | "Spa"
  | "Cinema"
  | "Concert"
  | "Casino"
  | "Amusement Park"
  | "Zoo"
  | "Religious"
  | "Hotel"
  | "Flight"
  | "Train"
  | "Car Rental"
  | "Cruise / Port";

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
  types: AttractionType[];
  durationValue: string;
  durationUnit: DurationUnit;
  price: number | null;
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
