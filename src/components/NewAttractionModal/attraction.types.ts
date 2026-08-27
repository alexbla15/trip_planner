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
  | "Villa"
  | "Lockers & Storage Rooms";

export type DurationUnit = "minutes" | "hours";

export type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface OpeningHoursRange {
  open: string;
  close: string;
}

export interface OpeningHoursDay {
  closed: boolean;
  ranges: OpeningHoursRange[];
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
  /** Only meaningful for dining-type attractions — admin-managed food style names. */
  foodStyles?: string[];
  durationValue: string;
  durationUnit: DurationUnit;
  price: number | null;
  currency: string;
  openingHours: OpeningHours;
  /** Months (1–12) this attraction is open in. Undefined means open year-round. */
  openingMonths?: number[];
  notes: string;
  photoUrl: string;
  websiteUrl: string;
  /** Id of the attraction this one is located inside (e.g. a restaurant inside a mall), or
   *  null when it's not nested. Display-only `parentAttractionName` rides alongside it so
   *  edit mode can show the picked parent without an extra fetch — never sent to the API. */
  parentAttractionId: string | null;
  parentAttractionName?: string | null;
  /** Display-only, like parentAttractionName — never edited/sent by this form. Used to
   *  detect "this attraction is a residence" so the form can hide fields that are
   *  meaningless on the shared document for a residence (opening hours/months are
   *  always-24/7 by convention; price/duration are per-trip, not shared-document,
   *  concerns for a residence). */
  subtype?: "residence" | "flight" | "custom-slot";
}

export interface NewAttractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AttractionFormData) => void;
  /** When provided, the country field is pre-filled and locked to this value. */
  defaultCountry?: string;
  /** When provided (and `defaultCountry`/`initialData` are not), pre-fills the country
   *  field with this value but leaves it editable/searchable — e.g. Explore reflecting
   *  whichever country is currently selected, without forcing the new attraction into it. */
  prefillCountry?: string;
  /** Same as `prefillCountry`, for the city field. */
  prefillCity?: string;
  /** When provided, the modal enters edit mode — all fields pre-filled, title changes to "Edit Attraction". */
  initialData?: AttractionFormData;
  /** When provided (and `initialData` is not), pre-fills just the location — e.g. from a
   *  dropped map pin — while keeping the modal in create mode ("New Attraction"). Triggers
   *  the same reverse-geocode auto-fill (name/city) as a user-driven map click. */
  initialCoordinates?: Coordinates | null;
  /** Id of the attraction being edited — used only to exclude itself from the "located
   *  inside" parent-picker search results. Omit in create mode. */
  editingAttractionId?: string;
  /** Auth token, forwarded to the parent-picker's search request. The "Located inside"
   *  field only renders when this is supplied — callers with no DB-backed country context
   *  yet (e.g. the new-trip inline picker) simply omit it and the field stays hidden. */
  token?: string | null;
}
