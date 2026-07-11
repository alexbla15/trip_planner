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

export interface CustomSlotInitialData extends CustomSlotFormData {}

export interface AddCustomSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CustomSlotFormData) => Promise<void>;
  tripStartDate: string;
  tripEndDate: string;
  currency: string;
  initialData?: CustomSlotInitialData;
}
