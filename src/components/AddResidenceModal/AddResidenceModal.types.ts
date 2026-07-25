export type ResidenceType = "Hotel" | "Apartment" | "Hostel" | "Villa" | "Other";

export interface ResidenceFormData {
  name: string;
  country: string;
  city: string;
  coordinates: { lat: number; lng: number } | null;
  residenceType: ResidenceType;
  checkInDate: string;
  checkOutDate: string;
  price: number | null;
  currency: string;
  notes: string;
  types: string[];
  subtype: "residence";
  /** Set when this submission links an existing (shared) residence document rather than creating a new one — see the "pick existing residence" flow. */
  existingAttractionId?: string;
}

/** Place data carried over from picking an existing residence in the search step — pre-fills the form, but stay dates/price/notes are intentionally left for the user to (re)enter for this trip. */
export interface ResidencePrefillData {
  existingAttractionId: string;
  name: string;
  city: string;
  coordinates: { lat: number; lng: number } | null;
  residenceType: ResidenceType;
}

export interface ResidenceInitialData {
  name: string;
  residenceType: ResidenceType;
  city: string;
  coordinates: { lat: number; lng: number } | null;
  checkInDate: string;
  checkOutDate: string;
  price: number | null;
  currency: string;
  notes: string;
}

export interface AddResidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ResidenceFormData) => void;
  tripCountry: string;
  tripCity?: string;
  tripStartDate: string;
  tripEndDate: string;
  currency?: string;
  initialData?: ResidenceInitialData;
  /** Pre-fills place fields from a picked existing residence; stay dates/price/notes stay blank for this trip. Ignored when `initialData` (edit mode) is set. */
  prefill?: ResidencePrefillData;
}
