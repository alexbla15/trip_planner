import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { MoodTag, formatMoodTag } from "@/models/MoodTag";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";

const DEFAULT_MOOD_TAGS = [
  { name: "Vibrant Nightlife",    icon: "Moon",           color: "#7c3aed", bgColor: "#f5f3ff", darkColor: "#c4b5fd", darkBgColor: "#2e1065", order: 0 },
  { name: "Cultural Heritage",    icon: "Landmark",       color: "#d97706", bgColor: "#fffbeb", darkColor: "#fcd34d", darkBgColor: "#431407", order: 1 },
  { name: "Adventure",            icon: "Mountain",       color: "#ea580c", bgColor: "#fff7ed", darkColor: "#fdba74", darkBgColor: "#431407", order: 2 },
  { name: "Beach Life",           icon: "Waves",          color: "#0891b2", bgColor: "#ecfeff", darkColor: "#67e8f9", darkBgColor: "#083344", order: 3 },
  { name: "Food & Wine",          icon: "UtensilsCrossed",color: "#dc2626", bgColor: "#fef2f2", darkColor: "#fca5a5", darkBgColor: "#450a0a", order: 4 },
  { name: "Luxury",               icon: "Gem",            color: "#b45309", bgColor: "#fefce8", darkColor: "#fbbf24", darkBgColor: "#451a03", order: 5 },
  { name: "Relaxation & Wellness",icon: "Sparkles",       color: "#0d9488", bgColor: "#f0fdfa", darkColor: "#5eead4", darkBgColor: "#042f2e", order: 6 },
  { name: "Couples & Romantic",   icon: "Heart",          color: "#db2777", bgColor: "#fdf2f8", darkColor: "#f9a8d4", darkBgColor: "#500724", order: 7 },
  { name: "Family",               icon: "Users",          color: "#2563eb", bgColor: "#eff6ff", darkColor: "#93c5fd", darkBgColor: "#1e3a5f", order: 8 },
  { name: "Backpacking & Budget", icon: "Backpack",       color: "#65a30d", bgColor: "#f7fee7", darkColor: "#a3e635", darkBgColor: "#1a2e05", order: 9 },
  { name: "Cruises",              icon: "Anchor",         color: "#4f46e5", bgColor: "#eef2ff", darkColor: "#a5b4fc", darkBgColor: "#1e1b4b", order: 10 },
];

/** Admin only — seeds the default mood tags (only inserts missing ones). */
export async function POST(req: Request) {
  try {
    const payload = getUserFromRequest(req);
    await dbConnect();

    const caller = await User.findById(payload.userId).select("role");
    if (caller?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await MoodTag.find().select("name");
    const existingNames = new Set(existing.map((t) => t.name));
    const toInsert = DEFAULT_MOOD_TAGS.filter((t) => !existingNames.has(t.name));

    if (toInsert.length === 0) {
      return NextResponse.json({ message: "All default mood tags already exist", inserted: 0 });
    }

    const inserted = await MoodTag.insertMany(toInsert);
    return NextResponse.json({
      message: `Seeded ${inserted.length} mood tag(s)`,
      inserted: inserted.length,
      tags: inserted.map(formatMoodTag),
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
