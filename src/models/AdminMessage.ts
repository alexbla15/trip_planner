import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IFieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface IAdminMessage extends Document {
  /** The attraction that was edited. Kept even if the attraction is later deleted, so the
   *  message stays readable — `attractionExists` (resolved at read time) tells the UI
   *  whether the "open attraction" action is still possible. */
  attractionId: Types.ObjectId;
  /** Denormalized so the message list never needs a join just to show what was edited. */
  attractionName: string;
  editedBy: Types.ObjectId;
  /** Denormalized editor name, same reasoning as attractionName. */
  editedByName: string;
  editedAt: Date;
  changes: IFieldChange[];
  read: boolean;
}

const FieldChangeSchema = new Schema<IFieldChange>(
  {
    field: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const AdminMessageSchema = new Schema<IAdminMessage>({
  attractionId: { type: Schema.Types.ObjectId, ref: "Attraction", required: true },
  attractionName: { type: String, required: true },
  editedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  editedByName: { type: String, required: true },
  editedAt: { type: Date, required: true, default: Date.now },
  changes: { type: [FieldChangeSchema], default: [] },
  read: { type: Boolean, required: true, default: false },
});

AdminMessageSchema.index({ editedAt: -1 });
AdminMessageSchema.index({ read: 1 });

export function formatAdminMessage(doc: IAdminMessage) {
  return {
    _id: doc._id.toString(),
    attractionId: doc.attractionId.toString(),
    attractionName: doc.attractionName,
    editedBy: doc.editedBy.toString(),
    editedByName: doc.editedByName,
    editedAt: doc.editedAt.toISOString(),
    changes: doc.changes,
    read: doc.read,
  };
}

export const AdminMessage =
  (mongoose.models.AdminMessage as mongoose.Model<IAdminMessage>) ||
  mongoose.model<IAdminMessage>("AdminMessage", AdminMessageSchema);
