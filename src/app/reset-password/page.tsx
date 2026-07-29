import type { Metadata } from "next";
import { Suspense } from "react";
import { RouteLoading } from "@/components";
import { ResetPasswordClient } from "./ResetPasswordClient";

export const metadata: Metadata = {
  title: "Reset Password · TripPlanner",
  description: "Choose a new TripPlanner password.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<RouteLoading label="Loading…" />}>
      <ResetPasswordClient />
    </Suspense>
  );
}
