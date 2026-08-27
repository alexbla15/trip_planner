import mongoose, { Schema, type Document } from "mongoose";

export interface IFoodStyle extends Document {
  name: string;
}

const FoodStyleSchema = new Schema<IFoodStyle>({
  name: { type: String, required: true, unique: true, trim: true },
});

export function formatFoodStyle(doc: IFoodStyle) {
  return {
    _id: doc._id.toString(),
    name: doc.name,
  };
}

export const FoodStyle =
  (mongoose.models.FoodStyle as mongoose.Model<IFoodStyle>) ||
  mongoose.model<IFoodStyle>("FoodStyle", FoodStyleSchema);
