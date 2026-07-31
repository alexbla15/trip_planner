import { dbConnect } from "@/lib/mongoose";
import { GeoBoundary } from "@/models/GeoBoundary";

// Fast in-process path on top of the persisted MongoDB cache below — avoids a DB
// round-trip for a key already read once in this process's lifetime.
const memCache = new Map<string, unknown>();

/** Returns { hit: true, data } if this key has been resolved before (persisted in
 *  Mongo, so it survives server restarts), or { hit: false } if it's never been
 *  looked up — the caller should then query Nominatim and call setCachedBoundary. */
export async function getCachedBoundary(key: string): Promise<{ hit: boolean; data: unknown }> {
  if (memCache.has(key)) return { hit: true, data: memCache.get(key) };

  await dbConnect();
  const doc = await GeoBoundary.findOne({ key }).lean();
  if (doc) {
    memCache.set(key, doc.data);
    return { hit: true, data: doc.data };
  }
  return { hit: false, data: null };
}

/** Persists a resolved (or confirmed-absent, i.e. null) boundary lookup so it's
 *  never re-fetched from Nominatim again for this key. */
export async function setCachedBoundary(key: string, data: unknown): Promise<void> {
  memCache.set(key, data);
  await dbConnect();
  await GeoBoundary.updateOne(
    { key },
    { $set: { data, fetchedAt: new Date() } },
    { upsert: true }
  );
}
