export type MonthlyCostType = "expense" | "income";

export interface MonthlyCost {
  id?: number;
  userId?: number;
  walletId?: number;
  type: MonthlyCostType;
  categoryId?: number | null;
  amount: number;
  name: string;
  dayOfMonth: number;
  active?: boolean;
  // 'YYYY-MM' of the calendar month this item was last paid for.
  lastPaidPeriod?: string | null;
  // 'remind tomorrow' marker: while set to today (or later), the item is hidden
  // from the "due" list until the day after.
  snoozeUntil?: string | null;
  createdAt?: string;
}
