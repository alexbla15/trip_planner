import { Gem, Camera, Moon, Landmark, Mountain, Waves, UtensilsCrossed } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const TAG_CLASS_MAP: Record<string, string> = {
  "Hidden Gems": "tagHiddenGems",
  Instagrammable: "tagInstagrammable",
  "Vibrant Nightlife": "tagVibrantNightlife",
  "Cultural Heritage": "tagCulturalHeritage",
  Adventure: "tagAdventure",
  "Beach Life": "tagBeachLife",
  "Food & Wine": "tagFoodWine",
};

export const TAG_ICON_MAP: Record<string, LucideIcon> = {
  "Hidden Gems": Gem,
  Instagrammable: Camera,
  "Vibrant Nightlife": Moon,
  "Cultural Heritage": Landmark,
  Adventure: Mountain,
  "Beach Life": Waves,
  "Food & Wine": UtensilsCrossed,
};
