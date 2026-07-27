export interface TripCollaborator {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface Trip {
  _id: string;
  ownerId?: string;
  ownerName?: string;
  ownerAvatarUrl?: string | null;
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
  calDayStart?: number;
  calDayEnd?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExploreItem {
  id: string;
  destination: string;
  country: string;
  coverImage: string;
  tag: string;    // primary display tag (first mood)
  tags: string[]; // all moods — used for vibe-chip filtering
  user: string;
  userAvatarUrl?: string;
  likes: number;
  cities: string[]; // deduplicated, sorted cities from this trip's attractions
}

