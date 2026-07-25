import type { Trip } from "@/types/trip";

/** Props for the trip collaborator/sharing management panel. `onTripUpdate` is called with the server's response after any add/remove/privacy change so the parent's trip state stays in sync. */
export interface TripSharingPanelProps {
  trip: Trip;
  token: string;
  onTripUpdate: (updated: Trip) => void;
}
