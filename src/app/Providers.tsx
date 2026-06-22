"use client";

import type { ReactNode } from "react";
import { AttractionsProvider } from "@/contexts/AttractionsContext";

export function Providers({ children }: { children: ReactNode }) {
  return <AttractionsProvider>{children}</AttractionsProvider>;
}
