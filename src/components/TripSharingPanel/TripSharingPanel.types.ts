import type { Trip } from "@/types/trip";

export interface TripSharingPanelProps {
  trip: Trip;
  token: string;
  onTripUpdate: (updated: Trip) => void;
}
