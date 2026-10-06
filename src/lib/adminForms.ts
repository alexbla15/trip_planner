import type { AttractionTypeRecord } from "@/types/attractionType";
import type { AttractionCategoryRecord } from "@/types/attractionCategory";
import type { MoodTagRecord } from "@/types/moodTag";

/** Editable form state for an attraction type in the admin panel — mirrors {@link AttractionTypeRecord}. */
export interface TypeFormState {
  name: string;
  categoryId: string;
  icon: string;
  subtype: string;
}

/** Converts a saved attraction type into editable form state. */
export function typeFormFromRecord(r: AttractionTypeRecord): TypeFormState {
  return {
    name:       r.name,
    categoryId: r.categoryId ?? "",
    icon:       r.icon,
    subtype:    r.subtype ?? "",
  };
}

/** Editable form state for an attraction category in the admin panel — mirrors {@link AttractionCategoryRecord}. */
export interface CategoryFormState {
  name: string;
  icon: string;
  color: string;
}

/** Converts a saved attraction category into editable form state. */
export function catFormFromRecord(r: AttractionCategoryRecord): CategoryFormState {
  return {
    name:  r.name,
    icon:  r.icon,
    color: r.color,
  };
}

/** Editable form state for a mood tag in the admin panel — mirrors {@link MoodTagRecord}. */
export interface MoodTagFormState {
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  darkColor: string;
  darkBgColor: string;
}

/** Converts a saved mood tag into editable form state. */
export function moodFormFromRecord(r: MoodTagRecord): MoodTagFormState {
  return {
    name: r.name, icon: r.icon,
    color: r.color, bgColor: r.bgColor,
    darkColor: r.darkColor, darkBgColor: r.darkBgColor,
  };
}

/** Editable form state for a food style in the admin panel — just a name, no icon/color. */
export interface FoodStyleFormState {
  name: string;
}

/** Converts a saved food style into editable form state. */
export function foodStyleFormFromRecord(r: { name: string }): FoodStyleFormState {
  return { name: r.name };
}

/** Editable form state for a shop style in the admin panel — mirrors FoodStyleFormState
 *  but includes an icon, same as MoodTagFormState/AttractionTypeFormState's icon field. */
export interface ShopStyleFormState {
  name: string;
  icon: string;
}

/** Converts a saved shop style into editable form state. */
export function shopStyleFormFromRecord(r: { name: string; icon: string }): ShopStyleFormState {
  return { name: r.name, icon: r.icon };
}

/** Editable form state for a brand (chain) in the admin panel — `types` holds the default
 *  category/type names a new attraction linked to this brand falls back to when it hasn't
 *  set its own (same contract as Attraction.types, just a default rather than a value). */
export interface BrandFormState {
  name: string;
  photoUrl: string;
  websiteUrl: string;
  types: string[];
}

/** Converts a saved brand into editable form state. */
export function brandFormFromRecord(r: { name: string; photoUrl?: string; websiteUrl?: string; types: string[] }): BrandFormState {
  return { name: r.name, photoUrl: r.photoUrl ?? "", websiteUrl: r.websiteUrl ?? "", types: r.types };
}
