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
  /** Required for all subtypes except "flight" (see schema `required` function). */
  city?: string;
  coordinates?: { lat: number; lng: number } | null;
  types: Types.ObjectId[];
  durationValue?: string;
  durationUnit?: "minutes" | "hours";
  price?: number | null;
  currency?: string;
  openingHours?: Record<string, IOpeningHoursDay>;
  notes?: string;
  photoUrl?: string;
  /** Official venue website — user-editable, separate from photoUrl. Never fabricated on
   *  backfill; left unset when no real official site exists for a place. */
  websiteUrl?: string;
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
    // Flights don't have a single city (they span a departure/arrival airport pair),
    // so city is only required for other subtypes.
    city: {
      type: String,
      required: function (this: IAttraction) { return this.subtype !== "flight"; },
      trim: true,
    },
    coordinates: {
      type: new Schema({ lat: Number, lng: Number }, { _id: false }),
      default: null,
    },
    types: [{ type: Schema.Types.ObjectId, ref: "AttractionType" }],
    durationValue: { type: String },
    durationUnit: { type: String, enum: ["minutes", "hours"] },
    price: { type: Number, default: null },
    currency: { type: String, default: "USD" },
    notes: { type: String },
    photoUrl: { type: String },
    websiteUrl: { type: String },
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
  schedule?: Partial<AttractionShape> | null,
  /** Row id override — pass the schedule-instance key when this row represents a 2nd+
   *  scheduled instance of `doc` (see `IScheduleEntry.attractionRef`). Defaults to the
   *  document's own id, matching every existing call site's behavior unchanged. */
  idOverride?: string,
  /** Whether the requesting user has marked this attraction visited — per-user, so
   *  callers must resolve it themselves (see `src/lib/services/visited.service.ts`)
   *  and never derive it from anything on `doc`. Defaults to false (unauthenticated
   *  callers / callers that haven't resolved visited status). */
  isVisited?: boolean
): AttractionShape {
  return {
    _id: idOverride ?? doc._id.toString(),
    attractionId: doc._id.toString(),
    isVisited: isVisited ?? false,
    ownerId: doc.ownerId?.toString(),
    name: doc.name,
    country: doc.country,
    city: doc.city,
    coordinates: doc.coordinates ?? null,
    types: (doc.types as unknown[]).map((t) =>
      t && typeof t === "object" && "name" in (t as Record<string, unknown>)
        ? (t as { name: string }).name
        : String(t)
    ),
    durationValue: doc.durationValue,
    durationUnit: doc.durationUnit,
    // price/notes prefer a per-trip schedule override for the same reason as
    // checkInDate/checkOutDate below — see the "pick existing residence" flow.
    price: schedule?.price ?? doc.price ?? null,
    currency: schedule?.currency ?? doc.currency ?? "USD",
    openingHours: doc.openingHours as AttractionShape["openingHours"],
    notes: schedule?.notes ?? doc.notes,
    photoUrl: doc.photoUrl,
    websiteUrl: doc.websiteUrl,
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
    // Subtype fields — checkInDate/checkOutDate prefer a per-trip schedule override (see
    // the "pick existing residence" flow) over the shared document's own value, so the same
    // residence document can be reused across trips with different stay dates. Falls back to
    // the document's value when no override exists (residences created before this feature,
    // or the "create new" flow, which still writes stay dates directly onto the document).
    subtype: doc.subtype,
    residenceType: doc.residenceType as AttractionShape["residenceType"],
    checkInDate: schedule?.checkInDate ?? doc.checkInDate,
    checkOutDate: schedule?.checkOutDate ?? doc.checkOutDate,
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
