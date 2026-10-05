import mongoose, { Schema, type Document } from "mongoose";

export interface IShopStyle extends Document {
  name: string;
  icon: string;
}

const ShopStyleSchema = new Schema<IShopStyle>({
  name: { type: String, required: true, unique: true, trim: true },
  icon: { type: String, required: true, default: "ShoppingBag" },
});

export function formatShopStyle(doc: IShopStyle) {
  return {
    _id: doc._id.toString(),
    name: doc.name,
    icon: doc.icon,
  };
}

export const ShopStyle =
  (mongoose.models.ShopStyle as mongoose.Model<IShopStyle>) ||
  mongoose.model<IShopStyle>("ShopStyle", ShopStyleSchema);
