import mongoose, { Schema, type Document, type Types } from "mongoose";
import type { Attraction as AttractionShape } from "@/types/attraction";

interface IOpeningHoursRange {
  open: string;
  close: string;
}

interface IOpeningHoursDay {
  closed: boolean;
  ranges: IOpeningHoursRange[];
}

export interface IPriceTier {
  label: string;
  amount: number;
  isPrimary: boolean;
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
  /** The Attraction this one is nested inside (e.g. a restaurant inside a mall) — one
   *  level of nesting only, enforced in the service layer (see nestedAttractions.service.ts).
   *  When set, coordinates/city/country are inherited from the parent at write time, not
   *  independently editable. */
  parentAttractionId?: Types.ObjectId | null;
  types: Types.ObjectId[];
  /** Only meaningful when the attraction's type/category is dining-related — one or more
   *  admin-managed food styles (e.g. "Sushi", "Fast Food"). Referenced by id (not a
   *  denormalized name snapshot), so renaming a FoodStyle doc is reflected automatically. */
  foodStyles?: Types.ObjectId[];
  durationValue?: string;
  durationUnit?: "minutes" | "hours";
  price?: number | null;
  /** Named price tiers (adult/child/reduced/etc.) — optional; when absent, `price` above is
   *  the attraction's one and only rate. Exactly one tier is flagged `isPrimary`; that tier's
   *  `amount` is kept in sync with the legacy `price` field on every write, so every existing
   *  consumer that reads `.price` directly (cards, budget calculations) keeps working
   *  unchanged. `formatAttraction` synthesizes a single-tier array from `price` on read for
   *  any document that predates this field, so callers can always rely on `prices` being
   *  non-empty without a real DB migration. */
  prices?: IPriceTier[];
  currency?: string;
  openingHours?: Record<string, IOpeningHoursDay>;
  /** Months (1–12) this attraction is open in. Absent/empty means open year-round. */
  openingMonths?: number[];
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

const OpeningHoursRangeSchema = new Schema<IOpeningHoursRange>(
  { open: String, close: String },
  { _id: false }
);

const OpeningHoursDaySchema = new Schema<IOpeningHoursDay>(
  { closed: Boolean, ranges: [OpeningHoursRangeSchema] },
  { _id: false }
);

const PriceTierSchema = new Schema<IPriceTier>(
  { label: { type: String, required: true, trim: true }, amount: { type: Number, required: true }, isPrimary: { type: Boolean, default: false } },
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
    parentAttractionId: { type: Schema.Types.ObjectId, ref: "Attraction", default: null },
    types: [{ type: Schema.Types.ObjectId, ref: "AttractionType" }],
    foodStyles: [{ type: Schema.Types.ObjectId, ref: "FoodStyle" }],
    durationValue: { type: String },
    durationUnit: { type: String, enum: ["minutes", "hours"] },
    price: { type: Number, default: null },
    prices: [PriceTierSchema],
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
    openingMonths: [{ type: Number, min: 1, max: 12 }],
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
AttractionSchema.index({ parentAttractionId: 1 });
// Backs searchAttractions' country/city filter (Explore's country + city views) and its
// `{ city: 1, name: 1 }` sort — without this, both the filtered `find` and the paired
// `countDocuments` fall back to a full collection scan plus an in-memory sort.
AttractionSchema.index({ country: 1, city: 1, name: 1 });
// Real-world places can share a name at different coordinates (e.g. two "Central Park"s),
// so uniqueness is enforced on name+coordinates together, not name alone. The partial filter
// only applies once coordinates are actually set — attractions without coordinates never
// collide with each other on name alone.
AttractionSchema.index(
  { name: 1, "coordinates.lat": 1, "coordinates.lng": 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 },
    partialFilterExpression: { "coordinates.lat": { $type: "number" }, "coordinates.lng": { $type: "number" } },
  }
);

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
  isVisited?: boolean,
  /** Names of the requesting user's own trips that already include this attraction —
   *  per-user, so callers must resolve it themselves (see
   *  `src/lib/services/usedInTrips.service.ts`) and never derive it from anything on
   *  `doc`. Defaults to empty (unauthenticated callers / callers that haven't resolved it). */
  usedInTripNames?: string[],
  /** This attraction's parent's name — set only when `doc.parentAttractionId` is set;
   *  resolved by callers via getParentName/getParentNameMap (see
   *  `src/lib/services/nestedAttractions.service.ts`) since the schema only stores the
   *  parent's id, not a denormalized name. */
  parentAttractionName?: string,
  /** How many other attractions reference this one as their parent — resolved by callers
   *  via getChildCount/getChildCountMap. Defaults to 0. */
  childAttractionCount?: number
): AttractionShape {
  // Synthesize a single primary tier from the legacy `price` field for any document that
  // predates multi-tier pricing (or was created/edited without specifying tiers) — callers
  // can always rely on `prices` being non-empty without a real DB migration.
  const prices: IPriceTier[] = doc.prices?.length
    ? doc.prices
    : [{ label: "Regular", amount: doc.price ?? 0, isPrimary: true }];

  return {
    _id: idOverride ?? doc._id.toString(),
    attractionId: doc._id.toString(),
    isVisited: isVisited ?? false,
    usedInTripNames: usedInTripNames ?? [],
    parentAttractionId: doc.parentAttractionId ? doc.parentAttractionId.toString() : null,
    parentAttractionName,
    childAttractionCount: childAttractionCount ?? 0,
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
    // Deleted FoodStyle docs leave a dangling ref that populate() resolves to null —
    // filter those out rather than rendering a stringified ObjectId/"null".
    foodStyles: ((doc.foodStyles as unknown[]) ?? [])
      .filter((f) => f && typeof f === "object" && "name" in (f as Record<string, unknown>))
      .map((f) => (f as { name: string }).name),
    durationValue: doc.durationValue,
    durationUnit: doc.durationUnit,
    // price/notes prefer a per-trip schedule override for the same reason as
    // checkInDate/checkOutDate below — see the "pick existing residence" flow.
    price: schedule?.price ?? doc.price ?? null,
    prices,
    currency: schedule?.currency ?? doc.currency ?? "USD",
    // Which of this attraction's price tiers (by label) the user selected for this
    // scheduled instance — per-trip, so it lives on the schedule entry, not the shared
    // document. Empty means "not yet chosen"; the Costs tab defaults to the primary tier.
    selectedPriceTierLabels: schedule?.selectedPriceTierLabels ?? [],
    openingHours: doc.openingHours as AttractionShape["openingHours"],
    openingMonths: doc.openingMonths,
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
