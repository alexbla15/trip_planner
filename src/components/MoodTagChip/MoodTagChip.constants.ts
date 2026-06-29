import {
  Moon, Landmark, Mountain, Waves, UtensilsCrossed,
  Gem, Sparkles, Heart, Users, Backpack, Anchor,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const TAG_CLASS_MAP: Record<string, string> = {
  "Vibrant Nightlife":    "tagVibrantNightlife",
  "Cultural Heritage":    "tagCulturalHeritage",
  "Adventure":            "tagAdventure",
  "Beach Life":           "tagBeachLife",
  "Food & Wine":          "tagFoodWine",
  "Luxury":               "tagLuxury",
  "Relaxation & Wellness":"tagRelaxationWellness",
  "Couples & Romantic":   "tagCouplesRomantic",
  "Family":               "tagFamily",
  "Backpacking & Budget": "tagBackpackingBudget",
  "Cruises":              "tagCruises",
};

export const TAG_ICON_MAP: Record<string, LucideIcon> = {
  "Vibrant Nightlife":    Moon,
  "Cultural Heritage":    Landmark,
  "Adventure":            Mountain,
  "Beach Life":           Waves,
  "Food & Wine":          UtensilsCrossed,
  "Luxury":               Gem,
  "Relaxation & Wellness":Sparkles,
  "Couples & Romantic":   Heart,
  "Family":               Users,
  "Backpacking & Budget": Backpack,
  "Cruises":              Anchor,
};
