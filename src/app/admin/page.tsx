import type { Metadata } from "next";
import { AdminClient } from "./AdminClient";

export const metadata: Metadata = {
  title: "Admin – TripPlanner",
  description: "Manage attraction types, categories, and mood tags.",
};

export default function AdminPage() {
  return <AdminClient />;
}
