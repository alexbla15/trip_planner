import type { Metadata } from "next";
import { LoginClient } from "./LoginClient";

export const metadata: Metadata = {
  title: "Sign In – TripPlanner",
  description: "Sign in to your TripPlanner account to plan your next adventure.",
};

export default function LoginPage() {
  return <LoginClient />;
}
