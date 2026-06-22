"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { AttractionFormData } from "@/components/NewAttractionModal/attraction.types";

interface AttractionsContextValue {
  globalAttractions: AttractionFormData[];
  addGlobalAttraction: (a: AttractionFormData) => void;
  removeGlobalAttraction: (index: number) => void;
}

const AttractionsContext = createContext<AttractionsContextValue>({
  globalAttractions: [],
  addGlobalAttraction: () => {},
  removeGlobalAttraction: () => {},
});

const STORAGE_KEY = "tripplanner_attractions";

export function AttractionsProvider({ children }: { children: ReactNode }) {
  const [globalAttractions, setGlobalAttractions] = useState<AttractionFormData[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setGlobalAttractions(JSON.parse(stored));
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(globalAttractions));
    } catch {
      // ignore quota errors
    }
  }, [globalAttractions]);

  function addGlobalAttraction(a: AttractionFormData) {
    setGlobalAttractions((prev) => [...prev, a]);
  }

  function removeGlobalAttraction(index: number) {
    setGlobalAttractions((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <AttractionsContext.Provider
      value={{ globalAttractions, addGlobalAttraction, removeGlobalAttraction }}
    >
      {children}
    </AttractionsContext.Provider>
  );
}

export function useGlobalAttractions(): AttractionsContextValue {
  return useContext(AttractionsContext);
}
