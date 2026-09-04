import type { VerifiedFilterValue } from "@/lib";

export interface ExploreUrlState {
  country: string | null;
  city: string | null;
  categories: string[];
  types: string[];
  foodStyles: string[];
  visited: "all" | "visited" | "unvisited";
  used: "all" | "used" | "unused";
  verified: VerifiedFilterValue;
}

/** Reads the Explore view's persisted state (selected country/city + active filters) back
 *  out of the URL's query string — the inverse of `buildExploreSearchParams`. Missing or
 *  malformed params fall back to the same defaults ExploreClient's own state starts at. */
export function parseExploreUrlState(searchParams: URLSearchParams): ExploreUrlState {
  const splitOrEmpty = (key: string): string[] => {
    const raw = searchParams.get(key);
    return raw ? raw.split(",").filter(Boolean) : [];
  };
  const oneOf = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
    const raw = searchParams.get(key);
    return (allowed as readonly string[]).includes(raw ?? "") ? (raw as T) : fallback;
  };

  return {
    country: searchParams.get("country"),
    city: searchParams.get("city"),
    categories: splitOrEmpty("categories"),
    types: splitOrEmpty("types"),
    foodStyles: splitOrEmpty("foodStyles"),
    visited: oneOf("visited", ["all", "visited", "unvisited"] as const, "all"),
    used: oneOf("used", ["all", "used", "unused"] as const, "all"),
    verified: oneOf("verified", ["all", "verified", "unverified"] as const, "all"),
  };
}

/** Builds the query string Explore's current view/filter state should be reflected as —
 *  the inverse of `parseExploreUrlState`. A field at its default/empty value is omitted
 *  entirely so the default "world view, no filters" state has no query string at all. */
export function buildExploreSearchParams(state: ExploreUrlState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.country) params.set("country", state.country);
  if (state.city) params.set("city", state.city);
  if (state.categories.length) params.set("categories", state.categories.join(","));
  if (state.types.length) params.set("types", state.types.join(","));
  if (state.foodStyles.length) params.set("foodStyles", state.foodStyles.join(","));
  if (state.visited !== "all") params.set("visited", state.visited);
  if (state.used !== "all") params.set("used", state.used);
  if (state.verified !== "all") params.set("verified", state.verified);
  return params;
}
