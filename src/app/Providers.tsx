"use client";

import type { ReactNode } from "react";
import { AttractionsProvider } from "@/contexts/AttractionsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <AttractionsProvider>{children}</AttractionsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
