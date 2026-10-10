export interface TripCollaborator {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface CustomExpense {
  _id: string;
  label: string;
  amount: number;
  /** Absent on expenses saved before the currency field was added — callers fall back to
   *  the trip's own currency. */
  currency?: string;
  /** YYYY-MM-DD — which day of the trip this belongs to on the Costs tab. Null means a
   *  general trip expense not tied to a specific day. */
  date?: string | null;
}

/** A day's alternate plan — name/id only; its actual schedule content isn't shipped to
 *  the client (see Trip.dayAlternatives doc comment in src/models/Trip.ts). Whichever
 *  alternative is active for a day (Trip.activeDayAlternative[day]) is what the server
 *  resolves into that day's attractions everywhere — calendar, map, costs, alerts. */
export interface DayAlternative {
  id: string;
  day: string; // YYYY-MM-DD
  name: string;
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
  customExpenses?: CustomExpense[];
  dayAlternatives?: DayAlternative[];
  /** day (YYYY-MM-DD) -> active alternative id; a day absent here is on its main schedule. */
  activeDayAlternative?: Record<string, string>;
  collaborators: TripCollaborator[];
  isPrivate: boolean;
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

