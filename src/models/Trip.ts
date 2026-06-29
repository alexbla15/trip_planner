import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ITrip extends Document {
  ownerId: Types.ObjectId;
  name: string;
  cities?: string[];
  country: string;
  coverImage?: string;
  startDate: Date;
  endDate: Date;
  budget?: number;
  currency?: string;
  moods: string[];
  notes?: string;
  attractionIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const TripSchema = new Schema<ITrip>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    cities: [{ type: String, trim: true }],
    country: { type: String, required: true, trim: true },
    coverImage: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    budget: { type: Number },
    currency: { type: String },
    moods: [{ type: String }],
    notes: { type: String },
    attractionIds: [{ type: Schema.Types.ObjectId, ref: "Attraction" }],
  },
  { timestamps: true }
);

TripSchema.index({ ownerId: 1, startDate: -1 });

export const Trip =
  (mongoose.models.Trip as mongoose.Model<ITrip>) ||
  mongoose.model<ITrip>("Trip", TripSchema);

export function formatTrip(doc: ITrip): import("@/types/trip").Trip {
  return {
    _id: doc._id.toString(),
    ownerId: doc.ownerId.toString(),
    name: doc.name,
    cities: doc.cities,
    country: doc.country,
    coverImage: doc.coverImage,
    startDate: doc.startDate.toISOString(),
    endDate: doc.endDate.toISOString(),
    budget: doc.budget,
    currency: doc.currency,
    moods: doc.moods,
    notes: doc.notes,
    attractionIds: doc.attractionIds?.map((id) => id.toString()) ?? [],
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
}
