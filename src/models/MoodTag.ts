import mongoose, { Schema, type Document } from "mongoose";

export interface IMoodTag extends Document {
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  darkColor: string;
  darkBgColor: string;
  order: number;
}

const MoodTagSchema = new Schema<IMoodTag>({
  name:        { type: String, required: true, unique: true, trim: true },
  icon:        { type: String, required: true },
  color:       { type: String, required: true },
  bgColor:     { type: String, required: true },
  darkColor:   { type: String, required: true },
  darkBgColor: { type: String, required: true },
  order:       { type: Number, default: 0 },
});

MoodTagSchema.index({ order: 1 });

export function formatMoodTag(doc: IMoodTag) {
  return {
    _id:         doc._id.toString(),
    name:        doc.name,
    icon:        doc.icon,
    color:       doc.color,
    bgColor:     doc.bgColor,
    darkColor:   doc.darkColor,
    darkBgColor: doc.darkBgColor,
    order:       doc.order,
  };
}

export const MoodTag =
  (mongoose.models.MoodTag as mongoose.Model<IMoodTag>) ||
  mongoose.model<IMoodTag>("MoodTag", MoodTagSchema);
