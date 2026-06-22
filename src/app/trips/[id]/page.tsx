import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { mockTrips } from "@/data/mockTrips";
import { TripDetailClient } from "./TripDetailClient";

interface TripDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: TripDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const trip = mockTrips.find((t) => t.id === id);
  if (!trip) return { title: "Trip Not Found – TripPlanner" };
  return {
    title: `${trip.destination} – TripPlanner`,
    description: `Your trip to ${trip.destination} from ${trip.startDate} to ${trip.endDate}.`,
  };
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const { id } = await params;
  const trip = mockTrips.find((t) => t.id === id);
  if (!trip) notFound();
  return <TripDetailClient trip={trip} />;
}
