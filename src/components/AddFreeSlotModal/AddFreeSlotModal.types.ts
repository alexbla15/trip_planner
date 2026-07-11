export interface FreeSlotFormData {
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

export interface FreeSlotInitialData extends FreeSlotFormData {}

export interface AddFreeSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FreeSlotFormData) => Promise<void>;
  tripStartDate: string;
  tripEndDate: string;
  currency: string;
  initialData?: FreeSlotInitialData;
}
