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
  { code: "AED", name: "UAE Dirham",               symbol: "د.إ"    },
  { code: "AFN", name: "Afghan Afghani",           symbol: "؋"      },
  { code: "ALL", name: "Albanian Lek",             symbol: "L",     postfix: true },
  { code: "AMD", name: "Armenian Dram",            symbol: "֏"      },
  { code: "ARS", name: "Argentine Peso",           symbol: "$"      },
  { code: "AUD", name: "Australian Dollar",        symbol: "A$"     },
  { code: "AZN", name: "Azerbaijani Manat",        symbol: "₼"      },
  { code: "BAM", name: "Bosnia-Herzegovina Mark",  symbol: "KM",    postfix: true },
  { code: "BBD", name: "Barbadian Dollar",         symbol: "Bds$"   },
  { code: "BDT", name: "Bangladeshi Taka",         symbol: "৳"      },
  { code: "BGN", name: "Bulgarian Lev",            symbol: "лв",    postfix: true },
  { code: "BHD", name: "Bahraini Dinar",           symbol: ".د.ب"   },
  { code: "BND", name: "Brunei Dollar",            symbol: "$"      },
  { code: "BOB", name: "Bolivian Boliviano",       symbol: "Bs."    },
  { code: "BRL", name: "Brazilian Real",           symbol: "R$"     },
  { code: "BSD", name: "Bahamian Dollar",          symbol: "B$"     },
  { code: "BWP", name: "Botswana Pula",            symbol: "P"      },
  { code: "BYN", name: "Belarusian Ruble",         symbol: "Br",    postfix: true },
  { code: "BZD", name: "Belize Dollar",            symbol: "BZ$"    },
  { code: "CAD", name: "Canadian Dollar",          symbol: "CA$"    },
  { code: "CHF", name: "Swiss Franc",              symbol: "Fr."    },
  { code: "CLP", name: "Chilean Peso",             symbol: "$"      },
  { code: "CNY", name: "Chinese Yuan",             symbol: "¥"      },
  { code: "COP", name: "Colombian Peso",           symbol: "$"      },
  { code: "CRC", name: "Costa Rican Colón",        symbol: "₡"      },
  { code: "CUP", name: "Cuban Peso",               symbol: "$"      },
  { code: "CZK", name: "Czech Koruna",             symbol: "Kč",    postfix: true },
  { code: "DKK", name: "Danish Krone",             symbol: "kr",    postfix: true },
  { code: "DOP", name: "Dominican Peso",           symbol: "RD$"    },
  { code: "DZD", name: "Algerian Dinar",           symbol: "دج"     },
  { code: "EGP", name: "Egyptian Pound",           symbol: "E£"     },
  { code: "ETB", name: "Ethiopian Birr",           symbol: "Br"     },
  { code: "EUR", name: "Euro",                     symbol: "€"      },
  { code: "FJD", name: "Fijian Dollar",            symbol: "FJ$"    },
  { code: "GBP", name: "British Pound",            symbol: "£"      },
  { code: "GEL", name: "Georgian Lari",            symbol: "₾"      },
  { code: "GHS", name: "Ghanaian Cedi",            symbol: "₵"      },
  { code: "GTQ", name: "Guatemalan Quetzal",       symbol: "Q"      },
  { code: "HKD", name: "Hong Kong Dollar",         symbol: "HK$"    },
  { code: "HNL", name: "Honduran Lempira",         symbol: "L"      },
  { code: "HRK", name: "Croatian Kuna",            symbol: "kn",    postfix: true },
  { code: "HTG", name: "Haitian Gourde",           symbol: "G"      },
  { code: "HUF", name: "Hungarian Forint",         symbol: "Ft",    postfix: true },
  { code: "IDR", name: "Indonesian Rupiah",        symbol: "Rp"     },
  { code: "ILS", name: "Israeli Shekel",           symbol: "₪"      },
  { code: "INR", name: "Indian Rupee",             symbol: "₹"      },
  { code: "IQD", name: "Iraqi Dinar",              symbol: "ع.د"    },
  { code: "IRR", name: "Iranian Rial",             symbol: "﷼"      },
  { code: "ISK", name: "Icelandic Króna",          symbol: "kr",    postfix: true },
  { code: "JMD", name: "Jamaican Dollar",          symbol: "J$"     },
  { code: "JOD", name: "Jordanian Dinar",          symbol: "د.أ"    },
  { code: "JPY", name: "Japanese Yen",             symbol: "¥"      },
  { code: "KES", name: "Kenyan Shilling",          symbol: "KSh"    },
  { code: "KGS", name: "Kyrgystani Som",           symbol: "лв",    postfix: true },
  { code: "KHR", name: "Cambodian Riel",           symbol: "៛",     postfix: true },
  { code: "KRW", name: "South Korean Won",         symbol: "₩"      },
  { code: "KWD", name: "Kuwaiti Dinar",            symbol: "د.ك"    },
  { code: "KZT", name: "Kazakhstani Tenge",        symbol: "₸",     postfix: true },
  { code: "LAK", name: "Laotian Kip",              symbol: "₭",     postfix: true },
  { code: "LBP", name: "Lebanese Pound",           symbol: "ل.ل"    },
  { code: "LKR", name: "Sri Lankan Rupee",         symbol: "₨"      },
  { code: "LYD", name: "Libyan Dinar",             symbol: "ل.د"    },
  { code: "MAD", name: "Moroccan Dirham",          symbol: "د.م."   },
  { code: "MDL", name: "Moldovan Leu",             symbol: "L",     postfix: true },
  { code: "MKD", name: "North Macedonian Denar",   symbol: "ден",   postfix: true },
  { code: "MMK", name: "Myanmar Kyat",             symbol: "K"      },
  { code: "MNT", name: "Mongolian Tögrög",         symbol: "₮",     postfix: true },
  { code: "MOP", name: "Macanese Pataca",          symbol: "P"      },
  { code: "MVR", name: "Maldivian Rufiyaa",        symbol: "ر"      },
  { code: "MXN", name: "Mexican Peso",             symbol: "MX$"    },
  { code: "MYR", name: "Malaysian Ringgit",        symbol: "RM"     },
  { code: "MZN", name: "Mozambican Metical",       symbol: "MT",    postfix: true },
  { code: "NAD", name: "Namibian Dollar",          symbol: "N$"     },
  { code: "NGN", name: "Nigerian Naira",           symbol: "₦"      },
  { code: "NIO", name: "Nicaraguan Córdoba",       symbol: "C$"     },
  { code: "NOK", name: "Norwegian Krone",          symbol: "kr",    postfix: true },
  { code: "NPR", name: "Nepalese Rupee",           symbol: "₨"      },
  { code: "NZD", name: "New Zealand Dollar",       symbol: "NZ$"    },
  { code: "OMR", name: "Omani Rial",               symbol: "ر.ع."   },
  { code: "PAB", name: "Panamanian Balboa",        symbol: "B/."    },
  { code: "PEN", name: "Peruvian Sol",             symbol: "S/"     },
  { code: "PGK", name: "Papua New Guinean Kina",   symbol: "K"      },
  { code: "PHP", name: "Philippine Peso",          symbol: "₱"      },
  { code: "PKR", name: "Pakistani Rupee",          symbol: "₨"      },
  { code: "PLN", name: "Polish Złoty",             symbol: "zł",    postfix: true },
  { code: "PYG", name: "Paraguayan Guaraní",       symbol: "₲",     postfix: true },
  { code: "QAR", name: "Qatari Riyal",             symbol: "ر.ق"    },
  { code: "RON", name: "Romanian Leu",             symbol: "lei",   postfix: true },
  { code: "RSD", name: "Serbian Dinar",            symbol: "дин",   postfix: true },
  { code: "RUB", name: "Russian Ruble",            symbol: "₽",     postfix: true },
  { code: "RWF", name: "Rwandan Franc",            symbol: "Fr"     },
  { code: "SAR", name: "Saudi Riyal",              symbol: "ر.س"    },
  { code: "SBD", name: "Solomon Islands Dollar",   symbol: "SI$"    },
  { code: "SDG", name: "Sudanese Pound",           symbol: "ج.س."   },
  { code: "SEK", name: "Swedish Krona",            symbol: "kr",    postfix: true },
  { code: "SGD", name: "Singapore Dollar",         symbol: "S$"     },
  { code: "SOS", name: "Somali Shilling",          symbol: "Sh"     },
  { code: "THB", name: "Thai Baht",                symbol: "฿"      },
  { code: "TJS", name: "Tajikistani Somoni",       symbol: "SM",    postfix: true },
  { code: "TMT", name: "Turkmenistani Manat",      symbol: "T",     postfix: true },
  { code: "TND", name: "Tunisian Dinar",           symbol: "د.ت"    },
  { code: "TOP", name: "Tongan Paʻanga",           symbol: "T$"     },
  { code: "TRY", name: "Turkish Lira",             symbol: "₺"      },
  { code: "TTD", name: "Trinidad & Tobago Dollar", symbol: "TT$"    },
  { code: "TWD", name: "New Taiwan Dollar",        symbol: "NT$"    },
  { code: "TZS", name: "Tanzanian Shilling",       symbol: "TSh"    },
  { code: "UAH", name: "Ukrainian Hryvnia",        symbol: "₴"      },
  { code: "UGX", name: "Ugandan Shilling",         symbol: "USh"    },
  { code: "USD", name: "US Dollar",               symbol: "$"      },
  { code: "UYU", name: "Uruguayan Peso",           symbol: "$U"     },
  { code: "UZS", name: "Uzbekistani Som",          symbol: "лв",    postfix: true },
  { code: "VES", name: "Venezuelan Bolívar",       symbol: "Bs.S"   },
  { code: "VND", name: "Vietnamese Dong",          symbol: "₫",     postfix: true },
  { code: "VUV", name: "Vanuatu Vatu",             symbol: "Vt",    postfix: true },
  { code: "WST", name: "Samoan Tālā",              symbol: "T"      },
  { code: "XAF", name: "Central African CFA Franc",symbol: "CFA"    },
  { code: "XCD", name: "East Caribbean Dollar",    symbol: "EC$"    },
  { code: "XOF", name: "West African CFA Franc",   symbol: "CFA"    },
  { code: "ZAR", name: "South African Rand",       symbol: "R"      },
  { code: "ZMW", name: "Zambian Kwacha",           symbol: "ZK"     },
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
