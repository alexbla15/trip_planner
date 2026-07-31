import mongoose, { Schema, type Document } from "mongoose";

/** Persisted cache of Nominatim boundary lookups (country or city polygons), so a
 *  successful lookup survives server restarts and is never re-fetched — boundaries
 *  don't change, and Nominatim's usage policy caps requests to ~1/sec, so repeated
 *  lookups for the same place across restarts are both wasteful and risk 429s. */
export interface IGeoBoundary extends Document {
  key: string; // "country:Georgia" or "city:Tbilisi|Georgia"
  data: unknown; // GeoJSON Feature, or null for a confirmed "no boundary found"
  fetchedAt: Date;
}

const GeoBoundarySchema = new Schema<IGeoBoundary>({
  key: { type: String, required: true, unique: true },
  data: { type: Schema.Types.Mixed, default: null },
  fetchedAt: { type: Date, default: Date.now },
});

export const GeoBoundary =
  (mongoose.models.GeoBoundary as mongoose.Model<IGeoBoundary>) ||
  mongoose.model<IGeoBoundary>("GeoBoundary", GeoBoundarySchema);
