import mongoose, { Schema, type Document, type Types } from "mongoose";
import type { Attraction as AttractionShape } from "@/types/attraction";

interface IOpeningHoursDay {
  closed: boolean;
  open: string;
  close: string;
}

export interface IAttraction extends Document {
  tripId: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  country: string;
  city: string;
  coordinates?: { lat: number; lng: number } | null;
  types: string[];
  durationValue?: string;
  durationUnit?: "minutes" | "hours";
  price?: number | null;
  openingHours?: Record<string, IOpeningHoursDay>;
  createdAt: Date;
  updatedAt: Date;
}

const OpeningHoursDaySchema = new Schema<IOpeningHoursDay>(
  { closed: Boolean, open: String, close: String },
  { _id: false }
);

const AttractionSchema = new Schema<IAttraction>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    coordinates: {
      type: new Schema({ lat: Number, lng: Number }, { _id: false }),
      default: null,
    },
    types: [{ type: String }],
    durationValue: { type: String },
    durationUnit: { type: String, enum: ["minutes", "hours"] },
    price: { type: Number, default: null },
    openingHours: {
      Mon: { type: OpeningHoursDaySchema },
      Tue: { type: OpeningHoursDaySchema },
      Wed: { type: OpeningHoursDaySchema },
      Thu: { type: OpeningHoursDaySchema },
      Fri: { type: OpeningHoursDaySchema },
      Sat: { type: OpeningHoursDaySchema },
      Sun: { type: OpeningHoursDaySchema },
    },
  },
  { timestamps: true }
);

AttractionSchema.index({ tripId: 1 });
AttractionSchema.index({ ownerId: 1 });

export const Attraction =
  (mongoose.models.Attraction as mongoose.Model<IAttraction>) ||
  mongoose.model<IAttraction>("Attraction", AttractionSchema);

export function formatAttraction(doc: IAttraction): AttractionShape {
  return {
    _id: doc._id.toString(),
    tripId: doc.tripId.toString(),
    ownerId: doc.ownerId.toString(),
    name: doc.name,
    country: doc.country,
    city: doc.city,
    coordinates: doc.coordinates ?? null,
    types: doc.types,
    durationValue: doc.durationValue,
    durationUnit: doc.durationUnit,
    price: doc.price ?? null,
    openingHours: doc.openingHours as AttractionShape["openingHours"],
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
}
