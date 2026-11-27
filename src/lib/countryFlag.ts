import countries from "i18n-iso-countries";
import enNames from "i18n-iso-countries/langs/en.json";

// Maps a country name (as stored on attractions and trips, or as commonly written) to an
// ISO 3166-1 alpha-2 code. The English ISO dataset covers every country, so new countries
// resolve without code changes. The aliases below cover common alternative spellings the
// dataset does not list. Each code selects public/flags/4x3/<code>.svg (flag-icons set).
countries.registerLocale(enNames);

const ALIASES: Record<string, string> = {
  usa: "US",
  "united states of america": "US",
  uk: "GB",
  england: "GB-ENG",
  scotland: "GB-SCT",
  wales: "GB-WLS",
  "northern ireland": "GB-NIR",
  "czech republic": "CZ",
  holland: "NL",
  macedonia: "MK",
  "vatican city": "VA",
  vatican: "VA",
  "viet nam": "VN",
  "ivory coast": "CI",
  "south korea": "KR",
  "north korea": "KP",
  burma: "MM",
  palestine: "PS",
  brunei: "BN",
  "cabo verde": "CV",
  "congo (brazzaville)": "CG",
  "congo (kinshasa)": "CD",
  laos: "LA",
  micronesia: "FM",
  moldova: "MD",
  "são tomé and príncipe": "ST",
  "sao tome and principe": "ST",
  syria: "SY",
};

/**
 * Lower-case flag code for a country name, or null when it is empty or unrecognised. Callers
 * that need a neutral fallback icon should check for null.
 */
export function countryFlagCode(country: string | null | undefined): string | null {
  const name = country?.trim();
  if (!name) return null;
  const lower = name.toLowerCase();
  const alias = ALIASES[lower];
  if (alias) return alias.toLowerCase();
  // Already an ISO alpha-2 code (for example "PT").
  if (/^[a-z]{2}$/i.test(name)) return lower;
  const code = countries.getAlpha2Code(name, "en");
  return code ? code.toLowerCase() : null;
}

/** Public path of the flag image for a country name, or null when it has no known flag. */
export function countryFlagSrc(country: string | null | undefined): string | null {
  const code = countryFlagCode(country);
  return code ? `/flags/4x3/${code}.svg` : null;
}
