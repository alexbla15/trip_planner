import mongoose, { Schema, type Document, type Types } from "mongoose";
import type { Attraction as AttractionShape } from "@/types/attraction";

interface IOpeningHoursDay {
  closed: boolean;
  open: string;
  close: string;
}

export interface IAttraction extends Document {
  // No tripId — attractions are global entities that can appear in many trips.
  // Scheduling (plannedDate, plannedTime, actualDuration) lives in Trip.schedules.
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

AttractionSchema.index({ ownerId: 1 });
AttractionSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

export const Attraction =
  (mongoose.models.Attraction as mongoose.Model<IAttraction>) ||
  mongoose.model<IAttraction>("Attraction", AttractionSchema);

export function formatAttraction(
  doc: IAttraction,
  schedule?: Partial<AttractionShape> | null
): AttractionShape {
  return {
    _id: doc._id.toString(),
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
    // Trip-specific scheduling (merged from Trip.schedules — null when not in a trip context)
    plannedDate: schedule?.plannedDate ?? null,
    plannedTime: schedule?.plannedTime ?? null,
    actualDurationValue: schedule?.actualDurationValue,
    actualDurationUnit: schedule?.actualDurationUnit,
  };
}
