import type { Metadata } from "next";
import { RouteGuard } from "@/components/RouteGuard/RouteGuard";
import { TripDetailClient } from "./TripDetailClient";

interface TripDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: TripDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Trip – TripPlanner`,
    description: `View your trip details.`,
    // id surfaced so Next can cache per-trip; real title set client-side after fetch
    other: { tripId: id },
  };
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const { id } = await params;
  return (
    <RouteGuard>
      <TripDetailClient tripId={id} />
    </RouteGuard>
  );
}
