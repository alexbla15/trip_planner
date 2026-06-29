/** @deprecated Use GET /api/explore instead */
import type { ExploreItem } from "@/types/trip";

export const mockExplore: ExploreItem[] = [
  { id: "e1", destination: "Santorini, Greece", coverImage: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&q=80", tag: "Relaxation & Wellness", tags: ["Relaxation & Wellness"], user: "sara_travels", likes: 342 },
  { id: "e2", destination: "Bangkok, Thailand", coverImage: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80", tag: "Vibrant Nightlife", tags: ["Vibrant Nightlife"], user: "mikeadventures", likes: 218 },
  { id: "e3", destination: "Kyoto, Japan", coverImage: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80", tag: "Cultural Heritage", tags: ["Cultural Heritage"], user: "wanderjapan", likes: 501 },
  { id: "e4", destination: "Amalfi Coast, Italy", coverImage: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80", tag: "Luxury", tags: ["Luxury"], user: "italyvibes", likes: 187 },
  { id: "e5", destination: "Bali, Indonesia", coverImage: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80", tag: "Beach Life", tags: ["Beach Life"], user: "balibliss", likes: 634 },
  { id: "e6", destination: "Patagonia, Argentina", coverImage: "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=600&q=80", tag: "Adventure", tags: ["Adventure"], user: "wildexplorer", likes: 289 },
  { id: "e7", destination: "Lyon, France", coverImage: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80", tag: "Food & Wine", tags: ["Food & Wine"], user: "frenchfoodie", likes: 156 },
  { id: "e8", destination: "Faroe Islands", coverImage: "https://images.unsplash.com/photo-1501436513145-30f24e19fcc8?w=600&q=80", tag: "Luxury", tags: ["Luxury"], user: "nordic_paths", likes: 423 },
];
