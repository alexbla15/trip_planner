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
  notes: string;
  types: string[];
  subtype: "residence";
}

export interface ResidenceInitialData {
  name: string;
  residenceType: ResidenceType;
  city: string;
  coordinates: { lat: number; lng: number } | null;
  checkInDate: string;
  checkOutDate: string;
  price: number | null;
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
}
