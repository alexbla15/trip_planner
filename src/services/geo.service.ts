import { parseOrThrow } from "./http";

const WORLD_COUNTRIES_GEOJSON_URL =
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

export async function getCityBoundary(name: string, country?: string): Promise<unknown> {
  const params = new URLSearchParams({ name });
  if (country) params.set("country", country);
  const res = await fetch(`/api/geo/city?${params}`);
  return parseOrThrow<unknown>(res);
}

export async function getCountryBoundary(name: string): Promise<unknown> {
  const res = await fetch(`/api/geo/country?name=${encodeURIComponent(name)}`);
  return parseOrThrow<unknown>(res);
}

export async function getWorldCountriesGeoJson(): Promise<unknown> {
  const res = await fetch(WORLD_COUNTRIES_GEOJSON_URL);
  return parseOrThrow<unknown>(res);
}
