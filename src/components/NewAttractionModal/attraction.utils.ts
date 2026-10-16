import type { Attraction } from "@/types/attraction";
import type { AttractionFormData, DurationUnit } from "./attraction.types";
import { buildInitialHours, hasOpeningHoursData, normalizeOpeningHours } from "@/lib/openingHours";

/** Maps a fetched `Attraction` (API shape) into `NewAttractionModal`'s form-input shape,
 *  for opening the modal in edit mode from any attraction list/detail view. */
export function attractionToFormData(a: Attraction): AttractionFormData {
  return {
    name: a.name,
    country: a.country,
    region: a.region,
    city: a.city ?? "",
    coordinates: a.coordinates ?? null,
    types: (a.types ?? []) as AttractionFormData["types"],
    foodStyles: a.foodStyles ?? [],
    shopStyles: a.shopStyles ?? [],
    durationValue: a.durationValue ?? "",
    durationUnit: (a.durationUnit ?? "hours") as DurationUnit,
    price: a.price ?? null,
    prices: a.prices,
    currency: a.currency ?? "USD",
    openingHours: hasOpeningHoursData(a.openingHours)
      ? normalizeOpeningHours(a.openingHours)
      : buildInitialHours(),
    openingMonths: a.openingMonths,
    seasonalHours: a.seasonalHours?.map((entry) => ({
      title: entry.title,
      start: entry.start,
      end: entry.end,
      hours: hasOpeningHoursData(entry.hours) ? normalizeOpeningHours(entry.hours) : buildInitialHours(),
    })),
    // Use the attraction's own unmerged values, not the brand-fallback-merged ones above —
    // otherwise opening a brand-linked attraction with no photo/website/notes of its own
    // would prefill the brand's value as if it were this attraction's own, and saving
    // unchanged would silently copy it in.
    notes: a.ownNotes ?? "",
    photoUrl: a.ownPhotoUrl ?? "",
    photoCrop: a.photoCrop,
    websiteUrl: a.ownWebsiteUrl ?? "",
    parentAttractionId: a.parentAttractionId ?? null,
    parentAttractionName: a.parentAttractionName ?? null,
    brandId: a.brandId ?? null,
    brandName: a.brandName ?? null,
    subtype: a.subtype,
  };
}
