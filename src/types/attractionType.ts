export interface AttractionTypeRecord {
  _id: string;
  name: string;
  category: string;
  icon: string;
  categoryIcon: string;
  color: string;
  subtype?: "flight" | "residence";
  order: number;
}
