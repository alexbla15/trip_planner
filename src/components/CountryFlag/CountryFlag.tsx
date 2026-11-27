import { countryFlagSrc } from "@/lib/countryFlag";
import styles from "./CountryFlag.module.css";

interface CountryFlagProps {
  /** Country name as stored on the attraction or trip. */
  country: string | null | undefined;
  /** Extra class names for placement (for example, the size the parent needs). */
  className?: string;
}

/**
 * Flag for a country name, drawn from the self-hosted flag-icons set. Decorative: callers
 * keep the country name in visible text, and the name is also offered as a tooltip. Renders
 * nothing for an unknown country, so callers can keep their own fallback icon.
 */
export function CountryFlag({ country, className }: CountryFlagProps) {
  const src = countryFlagSrc(country);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      title={country ?? undefined}
      className={`${styles.flag} ${className ?? ""}`}
      loading="lazy"
      decoding="async"
    />
  );
}
