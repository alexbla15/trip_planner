import type { Metadata } from "next";
import { NewTripClient } from "./NewTripClient";

export const metadata: Metadata = {
  title: "New Trip – TripPlanner",
  description: "Plan a new trip by filling in the details and adding attractions.",
};

export default function NewTripPage() {
  return <NewTripClient />;
}
