import type { Metadata } from "next";
import { RouteGuard } from "@/components/RouteGuard/RouteGuard";
import { EditTripClient } from "./EditTripClient";

interface EditTripPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditTripPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Edit Trip – TripPlanner",
    description: "Update your trip details.",
    other: { tripId: id },
  };
}

export default async function EditTripPage({ params }: EditTripPageProps) {
  const { id } = await params;
  return (
    <RouteGuard>
      <EditTripClient tripId={id} />
    </RouteGuard>
  );
}
