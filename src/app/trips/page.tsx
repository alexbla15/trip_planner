import type { Metadata } from "next";
import { TripsClient } from "./TripsClient";
import { mockTrips } from "@/data/mockTrips";

export const metadata: Metadata = {
  title: "My Trips – TripPlanner",
  description: "Browse and search all your planned trips.",
};

export default function TripsPage() {
  return <TripsClient trips={mockTrips} />;
}
