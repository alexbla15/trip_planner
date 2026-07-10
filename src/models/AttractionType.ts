import mongoose, { Schema, type Document, type Types } from "mongoose";
import type { IAttractionCategory } from "./AttractionCategory";

export interface IAttractionType extends Document {
  name: string;
  /** Reference to AttractionCategory. Populated when queried with .populate("categoryId"). */
  categoryId?: Types.ObjectId | IAttractionCategory;
  icon: string;
  subtype?: "flight" | "residence";
  order: number;
  // Legacy fields — kept so existing documents don't lose data before migration runs.
  category?: string;
  categoryIcon?: string;
  color?: string;
}

const AttractionTypeSchema = new Schema<IAttractionType>({
  name:         { type: String, required: true, unique: true, trim: true },
  categoryId:   { type: Schema.Types.ObjectId, ref: "AttractionCategory" },
  icon:         { type: String, required: true },
  subtype:      { type: String, enum: ["flight", "residence"] },
  order:        { type: Number, default: 0 },
  // Legacy — no longer written by new code; read-only for backward compat with unmigrated docs
  category:     { type: String, trim: true },
  categoryIcon: { type: String },
  color:        { type: String },
});

AttractionTypeSchema.index({ categoryId: 1, order: 1 });

export function formatAttractionType(doc: IAttractionType) {
  const cat = doc.categoryId as (IAttractionCategory & { _id: Types.ObjectId }) | null | undefined;
  const populated = cat && typeof cat === "object" && "name" in cat;

  const catId    = populated ? cat._id.toString() : (doc.categoryId?.toString() ?? null);
  const catName  = populated ? cat.name  : (doc.category     ?? "Uncategorized");
  const catIcon  = populated ? cat.icon  : (doc.categoryIcon ?? "Globe");
  const catColor = populated ? cat.color : (doc.color        ?? "#64748B");

  return {
    _id:          doc._id.toString(),
    name:         doc.name,
    categoryId:   catId,
    category:     catName,
    icon:         doc.icon,
    categoryIcon: catIcon,
    color:        catColor,
    subtype:      doc.subtype,
    order:        doc.order,
  };
}

export const AttractionType =
  (mongoose.models.AttractionType as mongoose.Model<IAttractionType>) ||
  mongoose.model<IAttractionType>("AttractionType", AttractionTypeSchema);
