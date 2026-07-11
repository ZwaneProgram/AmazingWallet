import { supabase } from "../supabase";
import { WALLET_GROUPS } from "../../constants/Tables";
import { WalletGroup } from "../../interfaces/Wallet";

const mapGroup = (row: any): WalletGroup => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  color: row.color ?? null,
  icon: row.icon ?? null,
  sortOrder: row.sort_order ?? 0,
  createdAt: row.created_at,
});

const getUserGroups = async (userId: number): Promise<WalletGroup[]> => {
  try {
    const { data, error } = await supabase
      .from(WALLET_GROUPS)
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapGroup);
  } catch (error) {
    console.log("getUserGroups failed:", error);
    return [];
  }
};

const createGroup = async (input: {
  userId: number;
  name: string;
  color?: string | null;
  icon?: string | null;
}): Promise<WalletGroup> => {
  const { data, error } = await supabase
    .from(WALLET_GROUPS)
    .insert({
      user_id: input.userId,
      name: input.name,
      color: input.color ?? null,
      icon: input.icon ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapGroup(data);
};

const updateGroup = async (
  id: number,
  fields: { name: string; color?: string | null; icon?: string | null }
): Promise<void> => {
  const { error } = await supabase
    .from(WALLET_GROUPS)
    .update({ name: fields.name, color: fields.color ?? null, icon: fields.icon ?? null })
    .eq("id", id);
  if (error) throw error;
};

// Deleting a group ungroups its wallets via the FK (ON DELETE SET NULL).
const deleteGroup = async (id: number): Promise<void> => {
  const { error } = await supabase.from(WALLET_GROUPS).delete().eq("id", id);
  if (error) throw error;
};

export const WalletGroupService = {
  getUserGroups,
  createGroup,
  updateGroup,
  deleteGroup,
};
