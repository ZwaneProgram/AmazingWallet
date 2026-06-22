import { CONVERT_EXPENSES_CURRENCY, GET_MONTH_EXPENSES } from "../../constants/PostgresFunctions";
import { EXPENSES } from "../../constants/Tables";
import { Expense } from "../../interfaces/Expense";
import { getCurrentDate } from "../../utils/getCurrentDate";
import { supabase } from "../supabase";

// const startMonth = moment().startOf("month").format("YYYY-MM-DD");
// const endMonth = moment().endOf("month").format("YYYY-MM-DD");

const AddExpense = async (expense: Expense) => {
  const { amount, categoryId, description, userId, walletId } = expense;

  const currentDate = getCurrentDate();

  await supabase.from("expenses").insert({
    user_id: userId,
    category_id: categoryId,
    amount,
    description,
    date: currentDate,
    wallet_id: walletId,
  });

  try {
  } catch (error) {
    if (error instanceof Error) {
      console.log(error);
    }
  }
};

const getMonthExpenses = async (userId: number, startOfMonth: string, endOfMonth: string, walletId: number) => {
  try {
    const { data } = await supabase.rpc(GET_MONTH_EXPENSES, {
      start_month: startOfMonth,
      end_month: endOfMonth,
      user_id: userId,
      wallet_id: walletId,
    });

    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.log(error);
    }
  }
};

const convertExpensesCurrency = async (userId: number, conversionRate: number) => {
  try {
    const { error } = await supabase.rpc(CONVERT_EXPENSES_CURRENCY, {
      user_id: userId,
      conversion_rate: conversionRate,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log(error);
    }
  }
};

const removeUserExpenses = async (userId: number) => {
  try {
    const { error } = await supabase.from(EXPENSES).delete().filter("user_id", "eq", userId);

    if (error) {
      throw error;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log(error);
    }
  }
};

const getAllExpenses = async (userId: number, walletId: number) => {
  try {
    const { data, error } = await supabase
      .from(EXPENSES)
      .select("id, amount, description, date, category_id, categories(name, color)")
      .eq("user_id", userId)
      .eq("wallet_id", walletId)
      .order("date", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      amount: row.amount,
      description: row.description,
      payDate: row.date,
      categoryId: row.category_id,
      name: row.categories?.name,
      color: row.categories?.color,
    }));
  } catch (error) {
    console.log("getAllExpenses failed:", error);
    return [];
  }
};

const updateExpense = async (
  id: number,
  fields: { amount: number; description?: string; categoryId?: number }
) => {
  const { error } = await supabase
    .from(EXPENSES)
    .update({
      amount: fields.amount,
      description: fields.description,
      category_id: fields.categoryId,
    })
    .eq("id", id);

  if (error) {
    throw error;
  }
};

const deleteExpense = async (id: number) => {
  const { error } = await supabase.from(EXPENSES).delete().eq("id", id);

  if (error) {
    throw error;
  }
};

export const ExpenseService = {
  AddExpense,
  getMonthExpenses,
  convertExpensesCurrency,
  removeUserExpenses,
  getAllExpenses,
  updateExpense,
  deleteExpense,
};
