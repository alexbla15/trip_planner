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
  | "Spa";

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
}

export interface NewAttractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AttractionFormData) => void;
}
