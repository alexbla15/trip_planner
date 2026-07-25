import mongoose, { Schema, type Document } from "mongoose";

export interface IAttractionCategory extends Document {
  name: string;
  icon: string;
  color: string;
}

const AttractionCategorySchema = new Schema<IAttractionCategory>({
  name:  { type: String, required: true, unique: true, trim: true },
  icon:  { type: String, required: true },
  color: { type: String, required: true },
});

export function formatAttractionCategory(doc: IAttractionCategory) {
  return {
    _id:   doc._id.toString(),
    name:  doc.name,
    icon:  doc.icon,
    color: doc.color,
  };
}

export const AttractionCategory =
  (mongoose.models.AttractionCategory as mongoose.Model<IAttractionCategory>) ||
  mongoose.model<IAttractionCategory>("AttractionCategory", AttractionCategorySchema);
