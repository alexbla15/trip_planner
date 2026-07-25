/** Payload submitted by {@link AddCustomSlotModalProps} on save — a labeled, typed itinerary time-slot. */
export interface CustomSlotFormData {
  name: string;
  plannedDate: string;
  plannedTime: string;
  actualDurationValue?: string;
  actualDurationUnit?: "hours" | "minutes";
  types: string[];
  price: number | null;
  currency: string;
  notes?: string;
}

/** Values used to prefill the modal when editing an existing custom time-slot. */
export interface CustomSlotInitialData extends CustomSlotFormData {}

/** Props for the add/edit custom time-slot modal. Pass `initialData` to edit an existing slot, omit it to create a new one. */
export interface AddCustomSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CustomSlotFormData) => Promise<void>;
  tripStartDate: string;
  tripEndDate: string;
  currency: string;
  initialData?: CustomSlotInitialData;
}
