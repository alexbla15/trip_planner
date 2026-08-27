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
