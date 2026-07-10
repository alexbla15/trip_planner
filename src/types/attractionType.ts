export interface AttractionTypeRecord {
  _id: string;
  name: string;
  /** ID of the linked AttractionCategory, or null for unmigrated legacy types. */
  categoryId: string | null;
  category: string;
  icon: string;
  categoryIcon: string;
  color: string;
  subtype?: "flight" | "residence";
  order: number;
}
