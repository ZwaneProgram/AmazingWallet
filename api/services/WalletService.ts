import { supabase } from "../supabase";
import { WALLETS } from "../../constants/Tables";
import { GET_WALLET_SUMMARIES } from "../../constants/PostgresFunctions";
import { Wallet, WalletSummary } from "../../interfaces/Wallet";
import { UserService } from "./UserService";

const mapWallet = (row: any): Wallet => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  icon: row.icon ?? null,
  color: row.color ?? null,
  isDefault: row.is_default ?? false,
  overallBudget: row.overall_budget ?? null,
  createdAt: row.created_at,
});

const getUserWallets = async (userId: number): Promise<Wallet[]> => {
  try {
    const { data, error } = await supabase
      .from(WALLETS)
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("id", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapWallet);
  } catch (error) {
    console.log("getUserWallets failed:", error);
    return [];
  }
};

const createWallet = async (input: {
  userId: number;
  name: string;
  icon?: string | null;
  color?: string | null;
}): Promise<Wallet> => {
  const { data, error } = await supabase
    .from(WALLETS)
    .insert({
      user_id: input.userId,
      name: input.name,
      icon: input.icon ?? null,
      color: input.color ?? null,
      is_default: false,
    })
    .select()
    .single();
  if (error) throw error;
  return mapWallet(data);
};

const updateWallet = async (
  id: number,
  fields: { name: string; icon?: string | null; color?: string | null }
): Promise<void> => {
  const { error } = await supabase
    .from(WALLETS)
    .update({ name: fields.name, icon: fields.icon ?? null, color: fields.color ?? null })
    .eq("id", id);
  if (error) throw error;
};

const updateOverallBudget = async (walletId: number, overallBudget: number): Promise<void> => {
  const { error } = await supabase
    .from(WALLETS)
    .update({ overall_budget: overallBudget })
    .eq("id", walletId);
  if (error) throw error;
};

const setDefaultWallet = async (userId: number, walletId: number): Promise<void> => {
  const clear = await supabase.from(WALLETS).update({ is_default: false }).eq("user_id", userId);
  if (clear.error) throw clear.error;
  const set = await supabase.from(WALLETS).update({ is_default: true }).eq("id", walletId);
  if (set.error) throw set.error;
};

// Counts rows that belong to a wallet, to decide empty vs. password-gated delete.
const walletHasData = async (walletId: number): Promise<boolean> => {
  const tables = ["expenses", "incomes", "monthly_budgets"];
  for (const t of tables) {
    const { count, error } = await supabase
      .from(t)
      .select("id", { count: "exact", head: true })
      .eq("wallet_id", walletId);
    if (error) throw error;
    if ((count ?? 0) > 0) return true;
  }
  return false;
};

// Deletes a wallet. Guards: cannot delete the last wallet; non-empty wallets require a
// correct account password. Promotes another wallet to default if the deleted one was default.
const deleteWallet = async (
  id: number,
  opts: { userId: number; email: string; password?: string }
): Promise<{ ok: boolean; reason?: "last-wallet" | "needs-password" | "bad-password" }> => {
  const wallets = await getUserWallets(opts.userId);
  if (wallets.length <= 1) return { ok: false, reason: "last-wallet" };

  const hasData = await walletHasData(id);
  if (hasData) {
    if (!opts.password) return { ok: false, reason: "needs-password" };
    const valid = await UserService.verifyPassword(opts.email, opts.password);
    if (!valid) return { ok: false, reason: "bad-password" };
  }

  const target = wallets.find((w) => w.id === id);
  const { error } = await supabase.from(WALLETS).delete().eq("id", id);
  if (error) throw error;

  if (target?.isDefault) {
    const next = wallets.find((w) => w.id !== id);
    if (next?.id) await setDefaultWallet(opts.userId, next.id);
  }
  return { ok: true };
};

const seedDefaultWallet = async (userId: number): Promise<Wallet> => {
  const { data, error } = await supabase
    .from(WALLETS)
    .insert({ user_id: userId, name: "Cash", is_default: true })
    .select()
    .single();
  if (error) throw error;
  return mapWallet(data);
};

const getWalletSummaries = async (
  userId: number,
  startOfMonth: string,
  endOfMonth: string
): Promise<WalletSummary[]> => {
  try {
    const { data, error } = await supabase.rpc(GET_WALLET_SUMMARIES, {
      user_id: userId,
      start_month: startOfMonth,
      end_month: endOfMonth,
    });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      walletId: row.wallet_id,
      name: row.name,
      icon: row.icon ?? null,
      color: row.color ?? null,
      incomeTotal: row.income_total ?? 0,
      expenseTotal: row.expense_total ?? 0,
      balance: row.balance ?? 0,
    }));
  } catch (error) {
    console.log("getWalletSummaries failed:", error);
    return [];
  }
};

export const WalletService = {
  getUserWallets,
  createWallet,
  updateWallet,
  updateOverallBudget,
  setDefaultWallet,
  deleteWallet,
  seedDefaultWallet,
  getWalletSummaries,
};
