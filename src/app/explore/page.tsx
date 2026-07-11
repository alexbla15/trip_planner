import type { Metadata } from "next";
import { ExploreClient } from "./ExploreClient";

export const metadata: Metadata = {
  title: "Explore the World · TripPlanner",
  description: "Browse public attractions around the world by city.",
};

export default function ExplorePage() {
  return <ExploreClient />;
}
