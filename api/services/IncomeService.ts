import { CONVERT_INCOMES_CURRENCY } from "../../constants/PostgresFunctions";
import { INCOMES } from "../../constants/Tables";
import { Income } from "../../interfaces/Income";
import { getCurrentDate } from "../../utils/getCurrentDate";
import { supabase } from "../supabase";

const addIncome = async (income: Income) => {
  const { amount, description, userId, walletId } = income;

  const currentDate = getCurrentDate();

  const { error } = await supabase.from(INCOMES).insert({
    user_id: userId,
    amount,
    description,
    date: currentDate,
    wallet_id: walletId,
  });

  if (error) {
    throw error;
  }
};

const getMonthIncomes = async (userId: number, startOfMonth: string, endOfMonth: string, walletId: number) => {
  try {
    const { data, error } = await supabase
      .from(INCOMES)
      .select("*")
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

const updateIncome = async (id: number, fields: { amount: number; description?: string }) => {
  const { error } = await supabase
    .from(INCOMES)
    .update({ amount: fields.amount, description: fields.description })
    .eq("id", id);

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
  updateIncome,
  deleteIncome,
};
