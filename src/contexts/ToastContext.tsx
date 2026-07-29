"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { ToastViewport } from "@/components/Toast";
import type { ToastItem, ToastVariant } from "@/components/Toast";

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  success: () => {},
  error: () => {},
});

const MAX_VISIBLE_TOASTS = 3;
const AUTO_DISMISS_MS = 3000;
const EXIT_ANIMATION_MS = 150;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => remove(id), EXIT_ANIMATION_MS);
  }, [remove]);

  const show = useCallback((variant: ToastVariant, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => {
      const next = [...prev, { id, variant, message }];
      return next.length > MAX_VISIBLE_TOASTS ? next.slice(next.length - MAX_VISIBLE_TOASTS) : next;
    });
    setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
  }, [dismiss]);

  const success = useCallback((message: string) => show("success", message), [show]);
  const error = useCallback((message: string) => show("error", message), [show]);

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
