import type { Trip, TripExpense } from "@/types/trip";
import type { Attraction } from "@/types/attraction";

export interface LocalExpense {
  id: string;
  label: string;
  amountStr: string;
  originalAmount: number;
  originalCurrency: string;
  attractionId?: string;
  subtype?: "flight" | "residence";
}

let nextTempId = 0;
export function tempId() { return `new-${++nextTempId}`; }

export function buildLocal(trip: Trip, attractions: Attraction[]): LocalExpense[] {
  const tripCurrency = trip.currency ?? "USD";
  const saved = trip.expenses ?? [];
  const savedByAttrId = new Map(
    saved.filter((e) => e.attractionId).map((e) => [e.attractionId!, e])
  );
  const attractionRows: LocalExpense[] = attractions
    .filter((a) => a.price != null)
    .map((a) => {
      const override = savedByAttrId.get(a._id);
      return {
        id:               override?._id ?? tempId(),
        label:            a.name,
        amountStr:        String(a.price ?? 0),
        originalAmount:   a.price ?? 0,
        originalCurrency: a.currency ?? tripCurrency,
        attractionId:     a._id,
        subtype:          a.subtype as "flight" | "residence" | undefined,
      };
    });
  const customRows: LocalExpense[] = saved
    .filter((e) => !e.attractionId)
    .map((e) => ({
      id:               e._id,
      label:            e.label,
      amountStr:        String(e.amount),
      originalAmount:   e.amount,
      originalCurrency: tripCurrency,
    }));
  return [...attractionRows, ...customRows];
}

export function applyRates(
  rows: LocalExpense[],
  rates: Map<string, number>,
  targetCurrency: string,
): LocalExpense[] {
  return rows.map((r) => {
    if (r.originalCurrency === targetCurrency) {
      return { ...r, amountStr: r.originalAmount.toFixed(2) };
    }
    const rate = rates.get(r.originalCurrency);
    if (rate == null) return r;
    return {
      ...r,
      amountStr: (Math.round(r.originalAmount * rate * 100) / 100).toFixed(2),
    };
  });
}

export function toApiExpenses(rows: LocalExpense[]): Omit<TripExpense, "_id">[] {
  return rows
    .filter((r) => r.label.trim())
    .map((r) => ({
      label:        r.label.trim(),
      amount:       Math.max(0, parseFloat(r.amountStr) || 0),
      attractionId: r.attractionId,
    }));
}
