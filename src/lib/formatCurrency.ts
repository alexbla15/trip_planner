const CODE_TO_SYMBOL: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
};

export function currencySymbol(code: string): string {
  return CODE_TO_SYMBOL[code] ?? code;
}
