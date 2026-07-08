/**
 * Single source of truth for every currency used across the app.
 *
 * Fields
 *   code    — ISO 4217 alphabetic code
 *   name    — English display name
 *   symbol  — conventional display symbol
 *   postfix — true when the symbol follows the amount (e.g. "1 000 Ft")
 */
export interface Currency {
  code: string;
  name: string;
  symbol: string;
  postfix?: true;
}

export const CURRENCIES: readonly Currency[] = [
  // ── North America ────────────────────────────────
  { code: "USD", name: "US Dollar",               symbol: "$"      },
  { code: "CAD", name: "Canadian Dollar",          symbol: "CA$"    },
  { code: "MXN", name: "Mexican Peso",             symbol: "MX$"    },

  // ── South America ────────────────────────────────
  { code: "BRL", name: "Brazilian Real",           symbol: "R$"     },
  { code: "ARS", name: "Argentine Peso",           symbol: "$"      },
  { code: "CLP", name: "Chilean Peso",             symbol: "$"      },
  { code: "COP", name: "Colombian Peso",           symbol: "$"      },
  { code: "PEN", name: "Peruvian Sol",             symbol: "S/"     },
  { code: "UYU", name: "Uruguayan Peso",           symbol: "$U"     },
  { code: "BOB", name: "Bolivian Boliviano",       symbol: "Bs."    },
  { code: "PYG", name: "Paraguayan Guaraní",       symbol: "₲",     postfix: true },
  { code: "VES", name: "Venezuelan Bolívar",       symbol: "Bs.S"   },

  // ── Western Europe ───────────────────────────────
  { code: "EUR", name: "Euro",                     symbol: "€"      },
  { code: "GBP", name: "British Pound",            symbol: "£"      },
  { code: "CHF", name: "Swiss Franc",              symbol: "Fr."    },
  { code: "NOK", name: "Norwegian Krone",          symbol: "kr",    postfix: true },
  { code: "SEK", name: "Swedish Krona",            symbol: "kr",    postfix: true },
  { code: "DKK", name: "Danish Krone",             symbol: "kr",    postfix: true },
  { code: "ISK", name: "Icelandic Króna",          symbol: "kr",    postfix: true },

  // ── Central & Eastern Europe ─────────────────────
  { code: "PLN", name: "Polish Złoty",             symbol: "zł",    postfix: true },
  { code: "CZK", name: "Czech Koruna",             symbol: "Kč",    postfix: true },
  { code: "HUF", name: "Hungarian Forint",         symbol: "Ft",    postfix: true },
  { code: "RON", name: "Romanian Leu",             symbol: "lei",   postfix: true },
  { code: "BGN", name: "Bulgarian Lev",            symbol: "лв",    postfix: true },
  { code: "HRK", name: "Croatian Kuna",            symbol: "kn",    postfix: true },
  { code: "RSD", name: "Serbian Dinar",            symbol: "дин",   postfix: true },
  { code: "BAM", name: "Bosnia-Herzegovina Mark",  symbol: "KM",    postfix: true },
  { code: "MKD", name: "North Macedonian Denar",   symbol: "ден",   postfix: true },
  { code: "ALL", name: "Albanian Lek",             symbol: "L",     postfix: true },
  { code: "MDL", name: "Moldovan Leu",             symbol: "L",     postfix: true },

  // ── Former Soviet / Caucasus ─────────────────────
  { code: "UAH", name: "Ukrainian Hryvnia",        symbol: "₴"      },
  { code: "RUB", name: "Russian Ruble",            symbol: "₽",     postfix: true },
  { code: "GEL", name: "Georgian Lari",            symbol: "₾"      },
  { code: "AMD", name: "Armenian Dram",            symbol: "֏"      },
  { code: "AZN", name: "Azerbaijani Manat",        symbol: "₼"      },
  { code: "BYN", name: "Belarusian Ruble",         symbol: "Br",    postfix: true },
  { code: "KZT", name: "Kazakhstani Tenge",        symbol: "₸",     postfix: true },
  { code: "UZS", name: "Uzbekistani Som",          symbol: "лв",    postfix: true },
  { code: "KGS", name: "Kyrgystani Som",           symbol: "лв",    postfix: true },
  { code: "TJS", name: "Tajikistani Somoni",       symbol: "SM",    postfix: true },
  { code: "TMT", name: "Turkmenistani Manat",      symbol: "T",     postfix: true },

  // ── Middle East ──────────────────────────────────
  { code: "AED", name: "UAE Dirham",               symbol: "د.إ"    },
  { code: "SAR", name: "Saudi Riyal",              symbol: "ر.س"    },
  { code: "QAR", name: "Qatari Riyal",             symbol: "ر.ق"    },
  { code: "KWD", name: "Kuwaiti Dinar",            symbol: "د.ك"    },
  { code: "BHD", name: "Bahraini Dinar",           symbol: ".د.ب"   },
  { code: "OMR", name: "Omani Rial",               symbol: "ر.ع."   },
  { code: "JOD", name: "Jordanian Dinar",          symbol: "د.أ"    },
  { code: "ILS", name: "Israeli Shekel",           symbol: "₪"      },
  { code: "IQD", name: "Iraqi Dinar",              symbol: "ع.د"    },
  { code: "IRR", name: "Iranian Rial",             symbol: "﷼"      },
  { code: "LBP", name: "Lebanese Pound",           symbol: "ل.ل"    },
  { code: "TRY", name: "Turkish Lira",             symbol: "₺"      },

  // ── North Africa ─────────────────────────────────
  { code: "EGP", name: "Egyptian Pound",           symbol: "E£"     },
  { code: "MAD", name: "Moroccan Dirham",          symbol: "د.م."   },
  { code: "TND", name: "Tunisian Dinar",           symbol: "د.ت"    },
  { code: "LYD", name: "Libyan Dinar",             symbol: "ل.د"    },
  { code: "DZD", name: "Algerian Dinar",           symbol: "دج"     },
  { code: "SDG", name: "Sudanese Pound",           symbol: "ج.س."   },

  // ── Sub-Saharan Africa ───────────────────────────
  { code: "ZAR", name: "South African Rand",       symbol: "R"      },
  { code: "NGN", name: "Nigerian Naira",           symbol: "₦"      },
  { code: "KES", name: "Kenyan Shilling",          symbol: "KSh"    },
  { code: "GHS", name: "Ghanaian Cedi",            symbol: "₵"      },
  { code: "TZS", name: "Tanzanian Shilling",       symbol: "TSh"    },
  { code: "UGX", name: "Ugandan Shilling",         symbol: "USh"    },
  { code: "ETB", name: "Ethiopian Birr",           symbol: "Br"     },
  { code: "XOF", name: "West African CFA Franc",   symbol: "CFA"    },
  { code: "XAF", name: "Central African CFA Franc",symbol: "CFA"    },
  { code: "ZMW", name: "Zambian Kwacha",           symbol: "ZK"     },
  { code: "BWP", name: "Botswana Pula",            symbol: "P"      },
  { code: "NAD", name: "Namibian Dollar",          symbol: "N$"     },
  { code: "MZN", name: "Mozambican Metical",       symbol: "MT",    postfix: true },
  { code: "RWF", name: "Rwandan Franc",            symbol: "Fr"     },
  { code: "SOS", name: "Somali Shilling",          symbol: "Sh"     },

  // ── South Asia ───────────────────────────────────
  { code: "INR", name: "Indian Rupee",             symbol: "₹"      },
  { code: "PKR", name: "Pakistani Rupee",          symbol: "₨"      },
  { code: "BDT", name: "Bangladeshi Taka",         symbol: "৳"      },
  { code: "LKR", name: "Sri Lankan Rupee",         symbol: "₨"      },
  { code: "NPR", name: "Nepalese Rupee",           symbol: "₨"      },
  { code: "AFN", name: "Afghan Afghani",           symbol: "؋"      },
  { code: "MVR", name: "Maldivian Rufiyaa",        symbol: "ر"      },

  // ── Southeast Asia ───────────────────────────────
  { code: "SGD", name: "Singapore Dollar",         symbol: "S$"     },
  { code: "THB", name: "Thai Baht",                symbol: "฿"      },
  { code: "MYR", name: "Malaysian Ringgit",        symbol: "RM"     },
  { code: "IDR", name: "Indonesian Rupiah",        symbol: "Rp"     },
  { code: "PHP", name: "Philippine Peso",          symbol: "₱"      },
  { code: "VND", name: "Vietnamese Dong",          symbol: "₫",     postfix: true },
  { code: "MMK", name: "Myanmar Kyat",             symbol: "K"      },
  { code: "KHR", name: "Cambodian Riel",           symbol: "៛",     postfix: true },
  { code: "LAK", name: "Laotian Kip",              symbol: "₭",     postfix: true },
  { code: "BND", name: "Brunei Dollar",            symbol: "$"      },

  // ── East Asia ────────────────────────────────────
  { code: "CNY", name: "Chinese Yuan",             symbol: "¥"      },
  { code: "JPY", name: "Japanese Yen",             symbol: "¥"      },
  { code: "KRW", name: "South Korean Won",         symbol: "₩"      },
  { code: "TWD", name: "New Taiwan Dollar",        symbol: "NT$"    },
  { code: "HKD", name: "Hong Kong Dollar",         symbol: "HK$"    },
  { code: "MOP", name: "Macanese Pataca",          symbol: "P"      },
  { code: "MNT", name: "Mongolian Tögrög",         symbol: "₮",     postfix: true },

  // ── Oceania ──────────────────────────────────────
  { code: "AUD", name: "Australian Dollar",        symbol: "A$"     },
  { code: "NZD", name: "New Zealand Dollar",       symbol: "NZ$"    },
  { code: "FJD", name: "Fijian Dollar",            symbol: "FJ$"    },
  { code: "PGK", name: "Papua New Guinean Kina",   symbol: "K"      },
  { code: "SBD", name: "Solomon Islands Dollar",   symbol: "SI$"    },
  { code: "TOP", name: "Tongan Paʻanga",           symbol: "T$"     },
  { code: "WST", name: "Samoan Tālā",              symbol: "T"      },
  { code: "VUV", name: "Vanuatu Vatu",             symbol: "Vt",    postfix: true },

  // ── Central America & Caribbean ──────────────────
  { code: "GTQ", name: "Guatemalan Quetzal",       symbol: "Q"      },
  { code: "HNL", name: "Honduran Lempira",         symbol: "L"      },
  { code: "NIO", name: "Nicaraguan Córdoba",       symbol: "C$"     },
  { code: "CRC", name: "Costa Rican Colón",        symbol: "₡"      },
  { code: "PAB", name: "Panamanian Balboa",        symbol: "B/."    },
  { code: "DOP", name: "Dominican Peso",           symbol: "RD$"    },
  { code: "JMD", name: "Jamaican Dollar",          symbol: "J$"     },
  { code: "TTD", name: "Trinidad & Tobago Dollar", symbol: "TT$"    },
  { code: "XCD", name: "East Caribbean Dollar",    symbol: "EC$"    },
  { code: "HTG", name: "Haitian Gourde",           symbol: "G"      },
  { code: "CUP", name: "Cuban Peso",               symbol: "$"      },
  { code: "BSD", name: "Bahamian Dollar",          symbol: "B$"     },
  { code: "BBD", name: "Barbadian Dollar",         symbol: "Bds$"   },
  { code: "BZD", name: "Belize Dollar",            symbol: "BZ$"    },
];

/** Look up a currency entry by its ISO code. Returns undefined if not found. */
export function getCurrency(code: string): Currency | undefined {
  return currencyIndex.get(code);
}

// Pre-build a lookup map for O(1) access by code.
const currencyIndex = new Map(CURRENCIES.map((c) => [c.code, c]));

// ── Formatting ────────────────────────────────────────────────────────────────

const CODE_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c.symbol])
);
const POSTFIX_SET = new Set(CURRENCIES.filter((c) => c.postfix).map((c) => c.code));

/** Returns the display symbol for a currency code, falling back to the code itself. */
export function currencySymbol(code: string): string {
  return CODE_TO_SYMBOL[code] ?? code;
}

export function isPostfixCurrency(code: string): boolean {
  return POSTFIX_SET.has(code);
}

/**
 * Formats a numeric amount as a localized monetary string with correct symbol placement.
 *
 * Pass raw numbers — do not pre-format with toLocaleString() before calling this.
 * Use `decimals` when you need a fixed decimal count (e.g. expense totals → 2).
 */
export function formatPrice(amount: number, code: string, options?: { decimals?: number }): string {
  const symbol = CODE_TO_SYMBOL[code] ?? code;
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: options?.decimals ?? 0,
    maximumFractionDigits: options?.decimals ?? 2,
  });
  return POSTFIX_SET.has(code) ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
}
