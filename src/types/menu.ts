export type MenuCategory =
  | "Signature Cocktails"
  | "Classics"
  | "Shots"
  | "Zero Proof"
  | "Seasonal Bites";

export type StrengthLevel = "Light" | "Medium" | "Strong";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  priceUsd: number; // price in USD (float for simplicity)
  category: MenuCategory;
  strength: StrengthLevel;
  isAlcoholic: boolean;
  tags: string[];
}


