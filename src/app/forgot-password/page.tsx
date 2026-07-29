import type { Metadata } from "next";
import { ForgotPasswordClient } from "./ForgotPasswordClient";

export const metadata: Metadata = {
  title: "Reset Password · TripPlanner",
  description: "Request a link to reset your TripPlanner password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
