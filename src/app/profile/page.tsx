import type { Metadata } from "next";
import { RouteGuard } from "@/components/RouteGuard/RouteGuard";
import { ProfileClient } from "./ProfileClient";

export const metadata: Metadata = {
  title: "My Profile – TripPlanner",
  description: "Manage your account and view your personal travel stats.",
};

export default function ProfilePage() {
  return (
    <RouteGuard>
      <ProfileClient />
    </RouteGuard>
  );
}
