import type { Metadata } from "next";
import { RouteGuard } from "@/components/RouteGuard/RouteGuard";
import { TripsClient } from "./TripsClient";

export const metadata: Metadata = {
  title: "My Trips – TripPlanner",
  description: "Browse and search all your planned trips.",
};

export default function TripsPage() {
  return (
    <RouteGuard>
      <TripsClient />
    </RouteGuard>
  );
}
