import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongoose";
import { AttractionCategory } from "@/models/AttractionCategory";
import { AttractionType } from "@/models/AttractionType";
import { User } from "@/models/User";
import { getUserFromRequest } from "@/lib/auth";

/**
 * Admin only — one-time migration helper.
 * Reads embedded category data from existing AttractionType documents,
 * creates AttractionCategory records for each unique category name,
 * then backfills categoryId on every type that is still using legacy fields.
 */
export async function POST(req: Request) {
  try {
    const payload = getUserFromRequest(req);
    await dbConnect();

    const caller = await User.findById(payload.userId).select("role");
    if (caller?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Gather all types that still have no categoryId
    const legacyTypes = await AttractionType.find({ categoryId: { $exists: false } })
      .select("category categoryIcon color");

    if (legacyTypes.length === 0) {
      return NextResponse.json({ message: "Nothing to migrate — all types already have a category assigned.", migrated: 0 });
    }

    // Deduplicate by category name (preserve first-seen icon & color)
    const seen = new Map<string, { icon: string; color: string }>();
    for (const t of legacyTypes) {
      const name = (t as unknown as { category?: string }).category;
      if (name && !seen.has(name)) {
        seen.set(name, {
          icon:  (t as unknown as { categoryIcon?: string }).categoryIcon ?? "Globe",
          color: (t as unknown as { color?: string }).color ?? "#64748B",
        });
      }
    }

    // Upsert categories
    let order = (await AttractionCategory.countDocuments()) * 10;
    const nameToId = new Map<string, string>();

    for (const [name, { icon, color }] of seen) {
      const existing = await AttractionCategory.findOne({ name });
      if (existing) {
        nameToId.set(name, existing._id.toString());
      } else {
        const created = await AttractionCategory.create({ name, icon, color, order });
        nameToId.set(name, created._id.toString());
        order += 10;
      }
    }

    // Backfill categoryId on legacy types
    let migrated = 0;
    for (const t of legacyTypes) {
      const name = (t as unknown as { category?: string }).category;
      const catId = name ? nameToId.get(name) : undefined;
      if (catId) {
        await AttractionType.updateOne({ _id: t._id }, { $set: { categoryId: catId } });
        migrated++;
      }
    }

    return NextResponse.json({
      message: `Migration complete. ${seen.size} categories created/found. ${migrated} types updated.`,
      categories: seen.size,
      migrated,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
