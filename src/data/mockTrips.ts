/**
 * @deprecated Mock data — no longer used in production pages.
 * Kept for reference/testing only. All trip data now comes from GET /api/trips.
 */
import type { Trip } from "@/types/trip";

export const mockTrips: Trip[] = [
  {
    _id: "1",
    name: "Tokyo Adventure",
    country: "Japan",
    coverImage:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80",
    startDate: "2025-07-15T00:00:00.000Z",
    endDate: "2025-07-22T00:00:00.000Z",
    moods: ["Cultural Heritage", "Food & Wine"],
    budget: 3000,
    currency: "JPY",
  },
  {
    _id: "2",
    name: "Paris Summer",
    country: "France",
    coverImage:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80",
    startDate: "2025-08-05T00:00:00.000Z",
    endDate: "2025-08-12T00:00:00.000Z",
    moods: ["Instagrammable", "Food & Wine"],
    budget: 2500,
    currency: "EUR",
  },
  {
    _id: "3",
    name: "Lisbon Escape",
    country: "Portugal",
    coverImage:
      "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&q=80",
    startDate: "2025-09-01T00:00:00.000Z",
    endDate: "2025-09-07T00:00:00.000Z",
    moods: ["Hidden Gems", "Beach Life"],
    budget: 1800,
    currency: "EUR",
  },
];
