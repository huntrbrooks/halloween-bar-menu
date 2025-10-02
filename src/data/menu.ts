import { MenuItem } from "@/types/menu";

export const menuItems: MenuItem[] = [
  {
    id: "witches-brew",
    name: "Witch's Brew",
    description:
      "Dark rum, blackberry, lime, activated charcoal, topped with dry ice fog.",
    priceUsd: 15,
    category: "Signature Cocktails",
    strength: "Medium",
    isAlcoholic: true,
    tags: ["smoky", "photo-worthy", "spooky"],
  },
  {
    id: "vampires-kiss",
    name: "Vampire's Kiss",
    description:
      "Vodka, pomegranate, raspberry, lemon. Rimmed with crimson sugar.",
    priceUsd: 14,
    category: "Signature Cocktails",
    strength: "Light",
    isAlcoholic: true,
    tags: ["fruity", "bright"],
  },
  {
    id: "black-cat-negroni",
    name: "Black Cat Negroni",
    description: "Gin, Campari, sweet vermouth, black cocoa tweak.",
    priceUsd: 16,
    category: "Classics",
    strength: "Strong",
    isAlcoholic: true,
    tags: ["bitter", "cocoa"],
  },
  {
    id: "pumpkin-old-fashioned",
    name: "Pumpkin Spice Old Fashioned",
    description: "Bourbon, pumpkin spice syrup, orange bitters, smoked cinnamon.",
    priceUsd: 17,
    category: "Classics",
    strength: "Strong",
    isAlcoholic: true,
    tags: ["smoked", "seasonal"],
  },
  {
    id: "graveyard-shot",
    name: "Graveyard Shot",
    description: "Coffee liqueur, tequila reposado, dash of saline.",
    priceUsd: 8,
    category: "Shots",
    strength: "Strong",
    isAlcoholic: true,
    tags: ["bold", "roasty"],
  },
  {
    id: "ghost-mocktail",
    name: "Ghost Mocktail",
    description: "Lychee, coconut, yuzu, soda. Eerily refreshing.",
    priceUsd: 10,
    category: "Zero Proof",
    strength: "Light",
    isAlcoholic: false,
    tags: ["tropical", "zero-proof"],
  },
  {
    id: "pumpkin-hand-pie",
    name: "Pumpkin Hand Pie",
    description: "Flaky crust, spiced pumpkin filling, vanilla glaze web.",
    priceUsd: 7,
    category: "Seasonal Bites",
    strength: "Light",
    isAlcoholic: false,
    tags: ["sweet", "bite"],
  },
];


