export interface SwapDaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Ordered ISO ("YYYY-MM-DD") day keys for the trip — populates both pickers. */
  days: string[];
  onSwap: (dayA: string, dayB: string) => void | Promise<void>;
}
