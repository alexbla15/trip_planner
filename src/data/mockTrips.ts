import type { Trip } from "@/types/trip";

export const mockTrips: Trip[] = [
  {
    id: "1",
    destination: "Tokyo, Japan",
    coverImage:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80",
    startDate: "Jul 15, 2025",
    endDate: "Jul 22, 2025",
    tags: ["Cultural Heritage", "Food & Wine"],
  },
  {
    id: "2",
    destination: "Paris, France",
    coverImage:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80",
    startDate: "Aug 5, 2025",
    endDate: "Aug 12, 2025",
    tags: ["Instagrammable", "Food & Wine"],
  },
  {
    id: "3",
    destination: "Lisbon, Portugal",
    coverImage:
      "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&q=80",
    startDate: "Sep 1, 2025",
    endDate: "Sep 7, 2025",
    tags: ["Hidden Gems", "Beach Life"],
  },
];
