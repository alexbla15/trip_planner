/**
 * Narrows the known-cities list to the selected country (if any) and returns
 * a deduped, alphabetically sorted list of city names for the searchable select.
 */
export function filterCityOptions(
  knownCities: { name: string; country: string }[],
  country: string,
): string[] {
  const scoped = country
    ? knownCities.filter((c) => c.country.toLowerCase() === country.toLowerCase())
    : knownCities;
  return [...new Set(scoped.map((c) => c.name))].sort((a, b) => a.localeCompare(b));
}
