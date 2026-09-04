import type { Metadata } from "next";
import { Suspense } from "react";
import { RouteLoading } from "@/components";
import { ExploreClient } from "./ExploreClient";

export const metadata: Metadata = {
  title: "Explore the World · TripPlanner",
  description: "Browse public attractions around the world by city.",
};

export default function ExplorePage() {
  return (
    <Suspense fallback={<RouteLoading label="Loading…" />}>
      <ExploreClient />
    </Suspense>
  );
}
