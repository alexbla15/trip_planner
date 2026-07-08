/** Shared constants and pure utilities used by both NewTripClient and EditTripClient. */

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$",    name: "US Dollar" },
  { code: "EUR", symbol: "€",    name: "Euro" },
  { code: "GBP", symbol: "£",    name: "British Pound" },
  { code: "JPY", symbol: "¥",    name: "Japanese Yen" },
  { code: "CAD", symbol: "CA$",  name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$",   name: "Australian Dollar" },
  { code: "CHF", symbol: "Fr",   name: "Swiss Franc" },
  { code: "CNY", symbol: "¥",    name: "Chinese Yuan" },
  { code: "INR", symbol: "₹",    name: "Indian Rupee" },
  { code: "MXN", symbol: "MX$",  name: "Mexican Peso" },
  { code: "BRL", symbol: "R$",   name: "Brazilian Real" },
  { code: "SEK", symbol: "kr",   name: "Swedish Krona" },
  { code: "NOK", symbol: "kr",   name: "Norwegian Krone" },
  { code: "PLN", symbol: "zł",   name: "Polish Zloty" },
  { code: "TRY", symbol: "₺",    name: "Turkish Lira" },
  { code: "SGD", symbol: "S$",   name: "Singapore Dollar" },
  { code: "HKD", symbol: "HK$",  name: "Hong Kong Dollar" },
  { code: "KRW", symbol: "₩",    name: "South Korean Won" },
  { code: "THB", symbol: "฿",    name: "Thai Baht" },
  { code: "AED", symbol: "د.إ",  name: "UAE Dirham" },
  { code: "ILS", symbol: "₪",    name: "Israeli Shekel" },
  { code: "HUF", symbol: "Ft",   name: "Hungarian Forint" },
];

/** Maximum character count for trip notes. */
export const NOTES_MAX = 500;

/**
 * Returns the inclusive number of days between two ISO date strings.
 * Returns null if either input is missing or invalid, or if end < start.
 */
export function getDurationDays(start: string, end: string): number | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  const days = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return days >= 0 ? days + 1 : null;
}

/** Returns a user-facing error message when end < start, otherwise null. */
export function getDateError(start: string, end: string): string | null {
  if (!start || !end) return null;
  if (new Date(end) < new Date(start)) return "End date must be on or after start date";
  return null;
}

/**
 * Returns a semantic warning level for the notes character counter.
 * Components map this to their own CSS classes.
 *   "warn"  → approaching the limit (within 50 chars)
 *   "error" → at or over the limit
 */
export function getNotesCountLevel(count: number, max: number): "ok" | "warn" | "error" {
  if (count >= max) return "error";
  if (count >= max - 50) return "warn";
  return "ok";
}
