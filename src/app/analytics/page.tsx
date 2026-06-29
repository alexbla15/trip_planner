import type { Metadata } from "next";
import { AnalyticsClient } from "./AnalyticsClient";

export const metadata: Metadata = {
  title: "Analytics – TripPlanner",
  description: "Platform-wide statistics across all TripPlanner users.",
};

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}
