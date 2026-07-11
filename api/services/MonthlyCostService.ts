import { supabase } from "../supabase";
import { MONTHLY_COSTS } from "../../constants/Tables";
import { MonthlyCost } from "../../interfaces/MonthlyCost";

const mapCost = (row: any): MonthlyCost => ({
  id: row.id,
  userId: row.user_id,
  walletId: row.wallet_id,
  type: row.type === "income" ? "income" : "expense",
  categoryId: row.category_id ?? null,
  amount: row.amount,
  name: row.name,
  dayOfMonth: row.day_of_month ?? 1,
  active: row.active ?? true,
  lastPaidPeriod: row.last_paid_period ?? null,
  snoozeUntil: row.snooze_until ?? null,
  createdAt: row.created_at,
});

const getUserMonthlyCosts = async (userId: number): Promise<MonthlyCost[]> => {
  try {
    const { data, error } = await supabase
      .from(MONTHLY_COSTS)
      .select("*")
      .eq("user_id", userId)
      .order("day_of_month", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapCost);
  } catch (error) {
    console.log("getUserMonthlyCosts failed:", error);
    return [];
  }
};

const createMonthlyCost = async (input: {
  userId: number;
  walletId: number;
  type: "expense" | "income";
  categoryId?: number | null;
  amount: number;
  name: string;
  dayOfMonth: number;
}): Promise<MonthlyCost> => {
  const { data, error } = await supabase
    .from(MONTHLY_COSTS)
    .insert({
      user_id: input.userId,
      wallet_id: input.walletId,
      type: input.type,
      category_id: input.categoryId ?? null,
      amount: input.amount,
      name: input.name,
      day_of_month: input.dayOfMonth,
    })
    .select()
    .single();
  if (error) throw error;
  return mapCost(data);
};

const updateMonthlyCost = async (
  id: number,
  fields: {
    walletId: number;
    type: "expense" | "income";
    categoryId?: number | null;
    amount: number;
    name: string;
    dayOfMonth: number;
  }
): Promise<void> => {
  const { error } = await supabase
    .from(MONTHLY_COSTS)
    .update({
      wallet_id: fields.walletId,
      type: fields.type,
      category_id: fields.categoryId ?? null,
      amount: fields.amount,
      name: fields.name,
      day_of_month: fields.dayOfMonth,
    })
    .eq("id", id);
  if (error) throw error;
};

const setActive = async (id: number, active: boolean): Promise<void> => {
  const { error } = await supabase.from(MONTHLY_COSTS).update({ active }).eq("id", id);
  if (error) throw error;
};

const deleteMonthlyCost = async (id: number): Promise<void> => {
  const { error } = await supabase.from(MONTHLY_COSTS).delete().eq("id", id);
  if (error) throw error;
};

// Stamp the item as paid for `period` (YYYY-MM) and clear any snooze.
const markPaid = async (id: number, period: string): Promise<void> => {
  const { error } = await supabase
    .from(MONTHLY_COSTS)
    .update({ last_paid_period: period, snooze_until: null })
    .eq("id", id);
  if (error) throw error;
};

// "Remind tomorrow": hide from the due list until the next day.
const snooze = async (id: number, untilDate: string): Promise<void> => {
  const { error } = await supabase
    .from(MONTHLY_COSTS)
    .update({ snooze_until: untilDate })
    .eq("id", id);
  if (error) throw error;
};

export const MonthlyCostService = {
  getUserMonthlyCosts,
  createMonthlyCost,
  updateMonthlyCost,
  setActive,
  deleteMonthlyCost,
  markPaid,
  snooze,
};
