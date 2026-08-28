import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IScheduleEntry {
  plannedDate?: string | null;
  plannedTime?: string | null;
  actualDurationValue?: string;
  actualDurationUnit?: "minutes" | "hours";
  /** True for custom time-slot entries — no corresponding Attraction document exists. */
  isCustomSlot?: boolean;
  /** Set only on a 2nd+ scheduled instance of a regular attraction — the shared
   *  Attraction document's real id. The schedule Map key for such an entry is a fresh
   *  synthetic id (`at-<objectId>`), NOT the attraction's own id, so multiple instances
   *  of the same attraction can each hold independent plannedDate/plannedTime. The
   *  primary/first instance is unchanged: its schedule key IS the attraction's own id,
   *  and this field is absent — fully backward compatible with existing trips. */
  attractionRef?: string;
  name?: string;
  typeNames?: string[];
  price?: number | null;
  currency?: string;
  /** How many of each of the linked Attraction's `prices` tiers (by label) the user
   *  selected for the trip Costs tab's total — e.g. 3x "Adult", 1x "Child". A tier absent
   *  from this list (or with quantity 0) isn't included. Per-trip — lives here, not on
   *  the shared Attraction document. */
  priceTierQuantities?: { label: string; quantity: number }[];
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

export interface ICustomExpense {
  _id: Types.ObjectId;
  label: string;
  amount: number;
  /** YYYY-MM-DD, matching IScheduleEntry.plannedDate's format — which day of the trip
   *  this expense belongs to on the Costs tab's daily breakdown. Absent/null means a
   *  general trip expense not tied to a specific day. */
  date?: string | null;
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
  /** Ad-hoc trip costs not tied to any attraction's price tiers (e.g. a taxi, a tip) —
   *  shown alongside attraction costs on the Costs tab's daily breakdown. */
  customExpenses?: ICustomExpense[];
  collaborators: ICollaborator[];
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CollaboratorSchema = new Schema<ICollaborator>(
  { userId: { type: Schema.Types.ObjectId, ref: "User", required: true } },
  { _id: false }
);

const CustomExpenseSchema = new Schema<ICustomExpense>({
  label:  { type: String, required: true, trim: true },
  amount: { type: Number, required: true },
  date:   { type: String, default: null },
});

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
    customExpenses: { type: [CustomExpenseSchema], default: [] },
    schedules: {
      type: Map,
      of: new Schema<IScheduleEntry>(
        {
          plannedDate:         { type: String, default: null },
          plannedTime:         { type: String, default: null },
          actualDurationValue: { type: String },
          actualDurationUnit:  { type: String, enum: ["minutes", "hours"] },
          isCustomSlot:        { type: Boolean },
          attractionRef:       { type: String },
          name:                { type: String },
          typeNames:           [{ type: String }],
          price:               { type: Number, default: null },
          currency:            { type: String },
          priceTierQuantities: [{ label: { type: String }, quantity: { type: Number }, _id: false }],
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
    customExpenses: (doc.customExpenses ?? []).map((e) => ({
      _id: e._id.toString(),
      label: e.label,
      amount: e.amount,
      date: e.date ?? null,
    })),
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
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
}
