export interface TripCollaborator {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
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
  expenses?: TripExpense[];
  calDayStart?: number;
  calDayEnd?: number;
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
  userAvatarUrl?: string;
  likes: number;
}

