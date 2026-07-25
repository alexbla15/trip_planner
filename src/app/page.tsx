import type { Metadata } from "next";
import { RouteGuard } from "@/components";
import { HomeClient } from "./HomeClient";

export const metadata: Metadata = {
  title: "TripPlanner",
  description: "Plan and visualize your trips around the globe.",
};

export default function Home() {
  return (
    <RouteGuard>
      <HomeClient />
    </RouteGuard>
  );
}
