import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IScheduleEntry {
  plannedDate?: string | null;
  plannedTime?: string | null;
  actualDurationValue?: string;
  actualDurationUnit?: "minutes" | "hours";
}

export interface ICollaborator {
  userId: Types.ObjectId;
  email: string;
  name: string;
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
  // Per-attraction scheduling — keyed by attraction _id string.
  // Stores plannedDate, plannedTime, actualDuration which are trip-specific.
  schedules: Map<string, IScheduleEntry>;
  collaborators: ICollaborator[];
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CollaboratorSchema = new Schema<ICollaborator>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    email:  { type: String, required: true, lowercase: true, trim: true },
    name:   { type: String, required: true, trim: true },
  },
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
        },
        { _id: false }
      ),
      default: {},
    },
    collaborators: { type: [CollaboratorSchema], default: [] },
    // When true, the trip is visible only to the owner and collaborators.
    // Any future public/unauthenticated trip-detail route must check this flag before returning.
    isPrivate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TripSchema.index({ ownerId: 1, startDate: -1 });
TripSchema.index({ "collaborators.userId": 1 });

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
    collaborators: (doc.collaborators ?? []).map((c) => ({
      userId: c.userId.toString(),
      email: c.email,
      name: c.name,
    })),
    isPrivate: doc.isPrivate ?? false,
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
}
