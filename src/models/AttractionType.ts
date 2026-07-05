import mongoose, { Schema, type Document } from "mongoose";

export interface IAttractionType extends Document {
  name: string;
  category: string;
  icon: string;         // Lucide icon name for the type chip (e.g. "Utensils")
  categoryIcon: string; // Lucide icon name for the category header (e.g. "UtensilsCrossed")
  color: string;        // hex color shared by all types in the same category
  subtype?: "flight" | "residence";
  order: number;
}

const AttractionTypeSchema = new Schema<IAttractionType>({
  name:         { type: String, required: true, unique: true, trim: true },
  category:     { type: String, required: true, trim: true },
  icon:         { type: String, required: true },
  categoryIcon: { type: String, required: true },
  color:        { type: String, required: true },
  subtype:      { type: String, enum: ["flight", "residence"] },
  order:        { type: Number, default: 0 },
});

AttractionTypeSchema.index({ category: 1, order: 1 });

export function formatAttractionType(doc: IAttractionType) {
  return {
    _id:          doc._id.toString(),
    name:         doc.name,
    category:     doc.category,
    icon:         doc.icon,
    categoryIcon: doc.categoryIcon,
    color:        doc.color,
    subtype:      doc.subtype,
    order:        doc.order,
  };
}

export const AttractionType =
  (mongoose.models.AttractionType as mongoose.Model<IAttractionType>) ||
  mongoose.model<IAttractionType>("AttractionType", AttractionTypeSchema);
