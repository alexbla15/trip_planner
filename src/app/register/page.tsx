import type { Metadata } from "next";
import { RegisterClient } from "./RegisterClient";

export const metadata: Metadata = {
  title: "Create Account – TripPlanner",
  description: "Create your TripPlanner account and start planning your perfect trips.",
};

export default function RegisterPage() {
  return <RegisterClient />;
}
