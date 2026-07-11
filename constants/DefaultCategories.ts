// Default categories seeded for new users. `icon` keys must exist in
// utils/categoryIcons.tsx ICON_OPTIONS. Expense and income are now separate sets.

type SeedCategory = { name: string; color: string; icon: string };

export const DEFAULT_EXPENSE_CATEGORIES: SeedCategory[] = [
  { name: "Grocery", color: "#10b981", icon: "shopping-cart" },
  { name: "Fuel", color: "#f97316", icon: "gas" },
  { name: "Food & Drink", color: "#ef4444", icon: "restaurant" },
  { name: "Clothes", color: "#8b5cf6", icon: "tshirt" },
  { name: "Gifts", color: "#ec4899", icon: "gift" },
  { name: "Travel", color: "#0ea5e9", icon: "airplane" },
  { name: "Medicine", color: "#14b8a6", icon: "pill" },
  { name: "Bills", color: "#eab308", icon: "bills" },
];

export const DEFAULT_INCOME_CATEGORIES: SeedCategory[] = [
  { name: "Salary", color: "#10b981", icon: "cash" },
  { name: "Bonus", color: "#f59e0b", icon: "star" },
  { name: "Interest", color: "#0ea5e9", icon: "savings" },
  { name: "Refund", color: "#8b5cf6", icon: "card" },
];
