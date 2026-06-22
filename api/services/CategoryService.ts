import moment from "moment";
import { supabase } from "../supabase";
import { CATEGORIES } from "../../constants/Tables";
import { GET_TOP_SPENDINGS } from "../../constants/PostgresFunctions";
import { DEFAULT_CATEGORIES } from "../../constants/DefaultCategories";

const getAllCategories = async () => {
  try {
    const { data } = await supabase.from(CATEGORIES).select("*");

    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.log(error);
    }
  }
};

const mapCategory = (row: any) => ({
  id: row.id,
  name: row.name,
  color: row.color,
  icon: row.icon,
  parentId: row.parent_id ?? null,
});

const getUserCategories = async (userId: number) => {
  try {
    const { data, error } = await supabase
      .from(CATEGORIES)
      .select("*")
      .eq("user_id", userId)
      .order("parent_id", { ascending: true, nullsFirst: true })
      .order("id", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapCategory);
  } catch (error) {
    console.log("getUserCategories failed:", error);
    return [];
  }
};

const createCategory = async (category: {
  userId: number;
  name: string;
  color: string;
  icon: string;
  parentId?: number | null;
}) => {
  const { data, error } = await supabase
    .from(CATEGORIES)
    .insert({
      user_id: category.userId,
      name: category.name,
      color: category.color,
      icon: category.icon,
      parent_id: category.parentId ?? null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapCategory(data);
};

const updateCategory = async (
  id: number,
  fields: { name: string; color: string; icon: string; parentId?: number | null }
) => {
  const { error } = await supabase
    .from(CATEGORIES)
    .update({
      name: fields.name,
      color: fields.color,
      icon: fields.icon,
      parent_id: fields.parentId ?? null,
    })
    .eq("id", id);

  if (error) {
    throw error;
  }
};

const deleteCategory = async (id: number) => {
  const { error } = await supabase.from(CATEGORIES).delete().eq("id", id);

  if (error) {
    throw error;
  }
};

const seedDefaultCategories = async (userId: number) => {
  const rows = DEFAULT_CATEGORIES.map((c) => ({
    user_id: userId,
    name: c.name,
    color: c.color,
    icon: c.icon,
    parent_id: null,
  }));

  const { data, error } = await supabase.from(CATEGORIES).insert(rows).select();

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapCategory);
};

const getTopSpendingCategories = async (userId: number) => {
  const startOfMonth = moment().startOf("month").format("YYYY-MM-DD");
  const endOfMonth = moment().endOf("month").format("YYYY-MM-DD");

  try {
    const { data } = await supabase.rpc(GET_TOP_SPENDINGS, {
      user_id: userId,
      start_month: startOfMonth,
      end_month: endOfMonth,
    });

    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.log(error);
    }
  }
};

export const CategoryService = {
  getAllCategories,
  getTopSpendingCategories,
  getUserCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  seedDefaultCategories,
};
