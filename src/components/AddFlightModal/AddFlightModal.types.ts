/** Payload submitted by {@link AddFlightModalProps} on save — an attraction-shaped flight record. */
export interface FlightFormData {
  name: string;
  country: string;
  city: string;
  types: string[];
  subtype: "flight";
  flightNumber: string;
  airline: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  price: number | null;
  currency: string;
  notes: string;
  plannedDate: string;
  plannedTime: string;
  durationValue: string;
  durationUnit: "minutes";
  actualDurationValue: string;
  actualDurationUnit: "minutes";
}

/** Values used to prefill the modal when editing an existing flight. */
export interface FlightInitialData {
  airline: string;
  flightNumber: string;
  flightDate: string;        // "YYYY-MM-DD"
  departureAirport: string;
  departureTimeHHMM: string; // "HH:MM"
  arrivalAirport: string;
  arrivalTimeHHMM: string;   // "HH:MM"
  price: number | null;
  currency: string;
  notes: string;
}

/** Props for the add/edit flight modal. Pass `initialData` to edit an existing flight, omit it to create a new one. */
export interface AddFlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FlightFormData) => void;
  tripCountry: string;
  tripCity?: string;
  tripStartDate: string;
  tripEndDate: string;
  currency?: string;
  initialData?: FlightInitialData;
}
