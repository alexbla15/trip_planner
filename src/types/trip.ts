export interface TripCollaborator {
  userId: string;
  email: string;
  name: string;
}

export interface TripExpense {
  _id: string;
  label: string;
  amount: number;
  attractionId?: string;
}

export interface Trip {
  _id: string;
  ownerId?: string;
  name: string;
  cities?: string[];
  country: string;
  coverImage?: string;
  startDate: string;   // ISO date string from API
  endDate: string;
  moods: string[];
  budget?: number;
  currency?: string;
  notes?: string;
  attractionIds?: string[];
  collaborators: TripCollaborator[];
  isPrivate: boolean;
  expenses?: TripExpense[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ExploreItem {
  id: string;
  destination: string;
  coverImage: string;
  tag: string;    // primary display tag (first mood)
  tags: string[]; // all moods — used for vibe-chip filtering
  user: string;
  likes: number;
}

export type MoodTag =
  | "Vibrant Nightlife"
  | "Cultural Heritage"
  | "Adventure"
  | "Beach Life"
  | "Food & Wine"
  | "Luxury"
  | "Relaxation & Wellness"
  | "Couples & Romantic"
  | "Family"
  | "Backpacking & Budget"
  | "Cruises";

export const ALL_MOOD_TAGS: MoodTag[] = [
  "Vibrant Nightlife",
  "Cultural Heritage",
  "Adventure",
  "Beach Life",
  "Food & Wine",
  "Luxury",
  "Relaxation & Wellness",
  "Couples & Romantic",
  "Family",
  "Backpacking & Budget",
  "Cruises",
];
