import { CONVERT_INCOMES_CURRENCY } from "../../constants/PostgresFunctions";
import { INCOMES } from "../../constants/Tables";
import { Income } from "../../interfaces/Income";
import { getCurrentDate } from "../../utils/getCurrentDate";
import { supabase } from "../supabase";

// Returns the inserted row's id + date (see AddExpense) so Redux holds the real id.
const addIncome = async (income: Income): Promise<{ id: number; payDate: string }> => {
  const { amount, description, userId, walletId, categoryId, payDate } = income;

  // Use the caller-supplied date when back-dating; otherwise today.
  const date = payDate || getCurrentDate();

  const { data, error } = await supabase
    .from(INCOMES)
    .insert({
      user_id: userId,
      amount,
      description,
      date,
      wallet_id: walletId,
      category_id: categoryId ?? null,
    })
    .select("id, date")
    .single();

  if (error) {
    throw error;
  }
  return { id: data.id, payDate: data.date };
};

const getMonthIncomes = async (userId: number, startOfMonth: string, endOfMonth: string, walletId: number) => {
  try {
    const { data, error } = await supabase
      .from(INCOMES)
      .select("*, categories(name, color)")
      .eq("user_id", userId)
      .eq("wallet_id", walletId)
      .gte("date", startOfMonth)
      .lte("date", endOfMonth);

    if (error) {
      throw error;
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      amount: row.amount,
      description: row.description,
      payDate: row.date,
      categoryId: row.category_id,
      name: row.categories?.name,
      color: row.categories?.color,
    }));
  } catch (error) {
    console.log("getMonthIncomes failed:", error);
    return [];
  }
};

const convertIncomesCurrency = async (userId: number, conversionRate: number) => {
  try {
    const { error } = await supabase.rpc(CONVERT_INCOMES_CURRENCY, {
      user_id: userId,
      conversion_rate: conversionRate,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.log("convertIncomesCurrency failed:", error);
  }
};

const removeUserIncomes = async (userId: number) => {
  try {
    const { error } = await supabase.from(INCOMES).delete().eq("user_id", userId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.log("removeUserIncomes failed:", error);
  }
};

const getAllIncomes = async (userId: number, walletId: number) => {
  try {
    const { data, error } = await supabase
      .from(INCOMES)
      .select("*")
      .eq("user_id", userId)
      .eq("wallet_id", walletId)
      .order("date", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      amount: row.amount,
      description: row.description,
      payDate: row.date,
    }));
  } catch (error) {
    console.log("getAllIncomes failed:", error);
    return [];
  }
};

// Same as getAllIncomes but across every wallet, tagging each row with its
// wallet_id so the History screen can label rows by wallet.
const getAllIncomesEveryWallet = async (userId: number) => {
  try {
    const { data, error } = await supabase
      .from(INCOMES)
      .select("*, categories(name, color)")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      amount: row.amount,
      description: row.description,
      payDate: row.date,
      walletId: row.wallet_id,
      categoryId: row.category_id,
      name: row.categories?.name,
      color: row.categories?.color,
    }));
  } catch (error) {
    console.log("getAllIncomesEveryWallet failed:", error);
    return [];
  }
};

const updateIncome = async (
  id: number,
  fields: { amount: number; description?: string; walletId?: number; categoryId?: number }
) => {
  const update: Record<string, any> = {
    amount: fields.amount,
    description: fields.description,
  };
  if (fields.walletId != null) {
    update.wallet_id = fields.walletId;
  }
  if (fields.categoryId !== undefined) {
    update.category_id = fields.categoryId ?? null;
  }

  const { error } = await supabase.from(INCOMES).update(update).eq("id", id);

  if (error) {
    throw error;
  }
};

const deleteIncome = async (id: number) => {
  const { error } = await supabase.from(INCOMES).delete().eq("id", id);

  if (error) {
    throw error;
  }
};

export const IncomeService = {
  addIncome,
  getMonthIncomes,
  convertIncomesCurrency,
  removeUserIncomes,
  getAllIncomes,
  getAllIncomesEveryWallet,
  updateIncome,
  deleteIncome,
};
