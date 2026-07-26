import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IScheduleEntry {
  plannedDate?: string | null;
  plannedTime?: string | null;
  actualDurationValue?: string;
  actualDurationUnit?: "minutes" | "hours";
  /** True for custom time-slot entries — no corresponding Attraction document exists. */
  isCustomSlot?: boolean;
  name?: string;
  typeNames?: string[];
  price?: number | null;
  currency?: string;
  notes?: string;
  /** Per-trip stay-date override for a shared residence Attraction document — see the
   *  "pick existing residence" flow. Never write these onto the shared document itself;
   *  a residence can be reused across trips with different stay dates each time. */
  checkInDate?: string;
  checkOutDate?: string;
  /** True for flight entries — no corresponding Attraction document exists (flights are
   *  trip-scoped only, unlike residences/regular attractions, so they can never collide
   *  across trips or be picked from another trip's existing-attractions list). */
  isFlight?: boolean;
  flightNumber?: string;
  airline?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureTime?: string;
  arrivalTime?: string;
  gate?: string;
  seat?: string;
}

export interface ICollaborator {
  userId: Types.ObjectId;
}

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
  schedules: Map<string, IScheduleEntry>;
  collaborators: ICollaborator[];
  isPrivate: boolean;
  calDayStart?: number;
  calDayEnd?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CollaboratorSchema = new Schema<ICollaborator>(
  { userId: { type: Schema.Types.ObjectId, ref: "User", required: true } },
  { _id: false }
);

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
    schedules: {
      type: Map,
      of: new Schema<IScheduleEntry>(
        {
          plannedDate:         { type: String, default: null },
          plannedTime:         { type: String, default: null },
          actualDurationValue: { type: String },
          actualDurationUnit:  { type: String, enum: ["minutes", "hours"] },
          isCustomSlot:        { type: Boolean },
          name:                { type: String },
          typeNames:           [{ type: String }],
          price:               { type: Number, default: null },
          currency:            { type: String },
          notes:               { type: String },
          checkInDate:         { type: String },
          checkOutDate:        { type: String },
          isFlight:            { type: Boolean },
          flightNumber:        { type: String },
          airline:             { type: String },
          departureAirport:    { type: String },
          arrivalAirport:      { type: String },
          departureTime:       { type: String },
          arrivalTime:         { type: String },
          gate:                { type: String },
          seat:                { type: String },
        },
        { _id: false }
      ),
      default: {},
    },
    collaborators: { type: [CollaboratorSchema], default: [] },
    isPrivate:     { type: Boolean, default: false },
    calDayStart:   { type: Number },
    calDayEnd:     { type: Number },
  },
  { timestamps: true }
);

TripSchema.index({ ownerId: 1, startDate: -1 });
TripSchema.index({ "collaborators.userId": 1 });

export const Trip =
  (mongoose.models.Trip as mongoose.Model<ITrip>) ||
  mongoose.model<ITrip>("Trip", TripSchema);

/** Resolves the id string for a ref field that may be a raw ObjectId, a populated document,
 *  or null (populate couldn't resolve the ref, e.g. the referenced user was deleted). Unlike
 *  `.toString()` on a populated Mongoose document — which returns an `inspect()` debug dump,
 *  not the id — this always returns the plain id string (or null). */
export function resolveRefId(ref: unknown): string | null {
  if (ref == null) return null;
  if (typeof ref === "object" && "_id" in (ref as object)) {
    return (ref as { _id: Types.ObjectId })._id.toString();
  }
  return (ref as Types.ObjectId).toString();
}

export function formatTrip(doc: ITrip): import("@/types/trip").Trip {
  // ownerId may be populated (when the route calls .populate("ownerId", "name avatarUrl"))
  const ownerRaw = doc.ownerId as unknown;
  const ownerIsPopulated =
    ownerRaw != null &&
    typeof ownerRaw === "object" &&
    "name" in (ownerRaw as object);
  const ownerDoc = ownerIsPopulated
    ? (ownerRaw as { _id: Types.ObjectId; name: string; avatarUrl?: string })
    : null;
  // ownerRaw is null when populate() couldn't resolve the ref (owner user was deleted) —
  // there's no id left to report in that case, so ownerId comes back undefined rather than throwing.
  const ownerIdRaw = ownerDoc ? ownerDoc._id : (ownerRaw as Types.ObjectId | null);

  return {
    _id: doc._id.toString(),
    ownerId: ownerIdRaw ? ownerIdRaw.toString() : undefined,
    ownerName: ownerDoc?.name,
    ownerAvatarUrl: ownerDoc?.avatarUrl ?? null,
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
    // userId is populated via .populate('collaborators.userId', 'name email avatarUrl'); a
    // collaborator whose user document was deleted populates to null — drop that entry rather
    // than throwing on .toString().
    collaborators: (doc.collaborators ?? [])
      .filter((c) => {
        const raw = c.userId as unknown;
        return raw != null && typeof raw === "object" && "name" in (raw as object);
      })
      .map((c) => {
        const u = c.userId as unknown as { _id: Types.ObjectId; name: string; email: string; avatarUrl?: string };
        return { userId: u._id.toString(), name: u.name, email: u.email, avatarUrl: u.avatarUrl ?? null };
      }),
    isPrivate: doc.isPrivate ?? false,
    calDayStart: doc.calDayStart,
    calDayEnd:   doc.calDayEnd,
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
}
