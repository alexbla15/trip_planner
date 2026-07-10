import type { Metadata } from "next";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongoose";
import { Trip } from "@/models/Trip";
import { RouteGuard } from "@/components/RouteGuard/RouteGuard";
import { TripDetailClient } from "./TripDetailClient";

interface TripDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: TripDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  let tripName = "Trip";
  try {
    if (mongoose.isValidObjectId(id)) {
      await dbConnect();
      const trip = await Trip.findById(id).select("name").lean();
      if (trip) tripName = (trip as { name: string }).name;
    }
  } catch {
    // fall through to default title
  }
  return {
    title: `${tripName} · Trip Planner`,
    description: `View your trip details.`,
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
