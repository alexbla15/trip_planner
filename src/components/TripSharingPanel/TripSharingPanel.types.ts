import type { Trip } from "@/types/trip";

/**
 * Props for the trip collaborator/sharing management panel.
 *
 * `mode: "live"` (default) — every action calls the trip API immediately and
 * `onTripUpdate` receives the server's response, for an already-created trip.
 *
 * `mode: "draft"` — for a trip that doesn't exist yet (e.g. the new-trip form,
 * before `_id` exists). No network calls are made for privacy/add/remove;
 * `onTripUpdate` is called synchronously with a locally-updated copy of `trip`
 * so the parent can hold the pending values until the trip is actually created.
 */
export interface TripSharingPanelProps {
  trip: Trip;
  token: string;
  onTripUpdate: (updated: Trip) => void;
  mode?: "live" | "draft";
}
