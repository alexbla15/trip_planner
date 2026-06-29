"use client";

import type { ReactNode } from "react";
import { AttractionsProvider } from "@/contexts/AttractionsContext";
import { AuthProvider } from "@/contexts/AuthContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AttractionsProvider>{children}</AttractionsProvider>
    </AuthProvider>
  );
}
