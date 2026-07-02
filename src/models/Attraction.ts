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
  notes?: string;
  photoUrl?: string;
  plannedDate?: string | null;
  plannedTime?: string | null;
  actualDurationValue?: string;
  actualDurationUnit?: "minutes" | "hours";
  createdAt: Date;
  updatedAt: Date;
  // Subtype discriminator
  subtype?: "residence" | "flight";
  // Residence fields
  residenceType?: string;
  checkInDate?: string;
  checkOutDate?: string;
  // Flight fields
  flightNumber?: string;
  airline?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureTime?: string;
  arrivalTime?: string;
  gate?: string;
  seat?: string;
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
    notes: { type: String },
    photoUrl: { type: String },
    plannedDate: { type: String, default: null },
    plannedTime: { type: String, default: null },
    actualDurationValue: { type: String },
    actualDurationUnit: { type: String, enum: ["minutes", "hours"] },
    openingHours: {
      Mon: { type: OpeningHoursDaySchema },
      Tue: { type: OpeningHoursDaySchema },
      Wed: { type: OpeningHoursDaySchema },
      Thu: { type: OpeningHoursDaySchema },
      Fri: { type: OpeningHoursDaySchema },
      Sat: { type: OpeningHoursDaySchema },
      Sun: { type: OpeningHoursDaySchema },
    },
    // Subtype discriminator
    subtype: { type: String, enum: ["residence", "flight"] },
    // Residence fields
    residenceType: { type: String },
    checkInDate:   { type: String },
    checkOutDate:  { type: String },
    // Flight fields
    flightNumber:      { type: String },
    airline:           { type: String },
    departureAirport:  { type: String },
    arrivalAirport:    { type: String },
    departureTime:     { type: String },
    arrivalTime:       { type: String },
    gate:              { type: String },
    seat:              { type: String },
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
    notes: doc.notes,
    photoUrl: doc.photoUrl,
    plannedDate: doc.plannedDate ?? null,
    plannedTime: doc.plannedTime ?? null,
    actualDurationValue: doc.actualDurationValue,
    actualDurationUnit: doc.actualDurationUnit,
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
    // Subtype fields
    subtype: doc.subtype,
    residenceType: doc.residenceType as AttractionShape["residenceType"],
    checkInDate: doc.checkInDate,
    checkOutDate: doc.checkOutDate,
    flightNumber: doc.flightNumber,
    airline: doc.airline,
    departureAirport: doc.departureAirport,
    arrivalAirport: doc.arrivalAirport,
    departureTime: doc.departureTime,
    arrivalTime: doc.arrivalTime,
    gate: doc.gate,
    seat: doc.seat,
  };
}
