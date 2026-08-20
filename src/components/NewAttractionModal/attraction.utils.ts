import type { Attraction } from "@/types/attraction";
import type { AttractionFormData, DurationUnit, OpeningHours } from "./attraction.types";
import { DEFAULT_OPENING_HOURS } from "./attraction.constants";

/** Maps a fetched `Attraction` (API shape) into `NewAttractionModal`'s form-input shape,
 *  for opening the modal in edit mode from any attraction list/detail view. */
export function attractionToFormData(a: Attraction): AttractionFormData {
  return {
    name: a.name,
    country: a.country,
    city: a.city ?? "",
    coordinates: a.coordinates ?? null,
    types: (a.types ?? []) as AttractionFormData["types"],
    durationValue: a.durationValue ?? "",
    durationUnit: (a.durationUnit ?? "hours") as DurationUnit,
    price: a.price ?? null,
    currency: a.currency ?? "USD",
    openingHours: (a.openingHours as OpeningHours | undefined)?.Mon
      ? (a.openingHours as OpeningHours)
      : structuredClone(DEFAULT_OPENING_HOURS),
    notes: a.notes ?? "",
    photoUrl: a.photoUrl ?? "",
    websiteUrl: a.websiteUrl ?? "",
  };
}
