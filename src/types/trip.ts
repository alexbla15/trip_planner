export interface Trip {
  id: string;
  destination: string;
  coverImage: string;
  startDate: string;
  endDate: string;
  tags: string[];
}

export interface ExploreItem {
  id: string;
  destination: string;
  coverImage: string;
  tag: string;
  user: string;
  likes: number;
}

export type MoodTag =
  | "Hidden Gems"
  | "Instagrammable"
  | "Vibrant Nightlife"
  | "Cultural Heritage"
  | "Adventure"
  | "Beach Life"
  | "Food & Wine";

export const ALL_MOOD_TAGS: MoodTag[] = [
  "Hidden Gems",
  "Instagrammable",
  "Vibrant Nightlife",
  "Cultural Heritage",
  "Adventure",
  "Beach Life",
  "Food & Wine",
];
