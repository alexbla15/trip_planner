const CODE_TO_SYMBOL: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "$",
  AUD: "$",
  CHF: "Fr.",
  CNY: "¥",
  INR: "₹",
  BRL: "R$",
  MXN: "$",
  SGD: "$",
  AED: "د.إ",
  ILS: "₪",
  HUF: "Ft",
  KRW: "₩",
  THB: "฿",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  PLN: "zł",
  CZK: "Kč",
  TRY: "₺",
  ZAR: "R",
  MYR: "RM",
  IDR: "Rp",
  PHP: "₱",
  NZD: "$",
  HKD: "$",
};

// Currencies whose symbol follows the number (e.g. "14 000 Ft" not "Ft14000")
const POSTFIX_CURRENCIES = new Set(["HUF", "SEK", "NOK", "DKK", "PLN", "CZK"]);

export function currencySymbol(code: string): string {
  return CODE_TO_SYMBOL[code] ?? code;
}

export function isPostfixCurrency(code: string): boolean {
  return POSTFIX_CURRENCIES.has(code);
}

/** Format a price with the correct symbol placement for the currency. */
export function formatPrice(amount: number | string, code: string): string {
  const symbol = CODE_TO_SYMBOL[code] ?? code;
  return POSTFIX_CURRENCIES.has(code)
    ? `${amount} ${symbol}`
    : `${symbol}${amount}`;
}
