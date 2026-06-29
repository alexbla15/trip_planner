"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./RouteGuard.module.css";

interface RouteGuardProps {
  children: ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className={styles.spinner} aria-busy="true" aria-label="Checking authentication">
        <Loader2 size={32} className={styles.icon} aria-hidden="true" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
