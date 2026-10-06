import mongoose, { Schema, type Document, type Types } from "mongoose";

/** A chain/brand (e.g. "Adidas", "McDonald's") that many individual Attraction documents
 *  can link to via `Attraction.brandId` — one place to hold the defaults (photo, types,
 *  website) that are the same across every location, so adding the 40th branch of a chain
 *  doesn't mean re-researching its logo/category from scratch. An attraction's own
 *  photoUrl/types/websiteUrl, when set, always win over the brand's (see
 *  `resolveBrandFallback` in `brands.service.ts`) — the brand only fills in what the
 *  attraction left blank. */
export interface IBrand extends Document {
  name: string;
  photoUrl?: string;
  websiteUrl?: string;
  types: Types.ObjectId[];
}

const BrandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: true, unique: true, trim: true, collation: { locale: "en", strength: 2 } },
    photoUrl: { type: String },
    websiteUrl: { type: String },
    types: [{ type: Schema.Types.ObjectId, ref: "AttractionType" }],
  },
  { timestamps: true }
);
BrandSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

export function formatBrand(doc: IBrand) {
  return {
    _id: doc._id.toString(),
    name: doc.name,
    photoUrl: doc.photoUrl,
    websiteUrl: doc.websiteUrl,
    types: (doc.types as unknown[]).map((t) =>
      t && typeof t === "object" && "name" in (t as Record<string, unknown>)
        ? (t as { name: string }).name
        : String(t)
    ),
  };
}

export const Brand =
  (mongoose.models.Brand as mongoose.Model<IBrand>) ||
  mongoose.model<IBrand>("Brand", BrandSchema);
