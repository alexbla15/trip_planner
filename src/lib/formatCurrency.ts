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
};

export function currencySymbol(code: string): string {
  return CODE_TO_SYMBOL[code] ?? code;
}
