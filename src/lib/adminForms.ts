import type { AttractionTypeRecord } from "@/types/attractionType";
import type { AttractionCategoryRecord } from "@/types/attractionCategory";
import type { MoodTagRecord } from "@/types/moodTag";

export interface TypeFormState {
  name: string;
  categoryId: string;
  icon: string;
  subtype: string;
  order: string;
}

export function typeFormFromRecord(r: AttractionTypeRecord): TypeFormState {
  return {
    name:       r.name,
    categoryId: r.categoryId ?? "",
    icon:       r.icon,
    subtype:    r.subtype ?? "",
    order:      String(r.order),
  };
}

export interface CategoryFormState {
  name: string;
  icon: string;
  color: string;
  order: string;
}

export function catFormFromRecord(r: AttractionCategoryRecord): CategoryFormState {
  return {
    name:  r.name,
    icon:  r.icon,
    color: r.color,
    order: String(r.order),
  };
}

export interface MoodTagFormState {
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  darkColor: string;
  darkBgColor: string;
  order: string;
}

export function moodFormFromRecord(r: MoodTagRecord): MoodTagFormState {
  return {
    name: r.name, icon: r.icon,
    color: r.color, bgColor: r.bgColor,
    darkColor: r.darkColor, darkBgColor: r.darkBgColor,
    order: String(r.order),
  };
}
