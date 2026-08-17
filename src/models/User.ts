import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatarUrl?: string;
  role: "user" | "admin";
  createdAt: Date;
  resetTokenHash?: string;
  resetTokenExpiry?: Date;
  /** Attractions this user has personally marked as visited — a private, per-user
   *  fact independent of any trip (an attraction is a shared/global entity, so this
   *  can never live on the Attraction document itself). */
  visitedAttractionIds: Types.ObjectId[];
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    avatarUrl: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    // Password reset — the raw token is only ever emailed, never persisted;
    // only its hash + expiry live on the document (see src/lib/passwordReset.ts).
    resetTokenHash: { type: String, select: false },
    resetTokenExpiry: { type: Date, select: false },
    visitedAttractionIds: [{ type: Schema.Types.ObjectId, ref: "Attraction" }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const User =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);
