import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  HStack,
  VStack,
  Box,
  Pressable,
  ScrollView,
  Modal,
  Spinner,
  Divider,
} from "native-base";
import { Alert, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NavigationProp, ParamListBase } from "@react-navigation/native";
import EZHeaderTitle from "../components/shared/EzHeaderTitle";
import { useDispatch, useSelector } from "react-redux";
import { StatusBar } from "expo-status-bar";
import { RootState } from "../redux/store";
import COLORS from "../colors";
import { renderCategoryIcon } from "../utils/categoryIcons";
import { ExpenseService } from "../api/services/ExpenseService";
import { IncomeService } from "../api/services/IncomeService";
import { CategoryService } from "../api/services/CategoryService";
import { Category } from "../interfaces/Category";
import EZInput from "../components/shared/EZInput";
import EZButton from "../components/shared/EZButton";
import GroupedTransactionList from "../components/GroupedTransactionList";
import { authInput } from "../commonStyles";
import {
  categoriesSelector,
  removeExpenseAction,
  removeIncomeAction,
  setCategoriesAction,
  updateExpenseAction,
  updateIncomeAction,
} from "../redux/expensesReducers";

type Kind = "expense" | "income";
type Filter = "all" | "expense" | "income";

interface Txn {
  id: number;
  kind: Kind;
  amount: number;
  description?: string;
  payDate: string;
  name?: string;
  color?: string;
  categoryId?: number;
}

interface TransactionsScreenProps {
  navigation: NavigationProp<ParamListBase>;
}

const TransactionsScreen: React.FC<TransactionsScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch();
  const user: any = useSelector((state: RootState) => state.user);
  const categories = useSelector(categoriesSelector);

  const [loading, setLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  // edit modal state
  const [editing, setEditing] = useState<Txn | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editCategoryId, setEditCategoryId] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState<boolean>(false);

  // Alert.alert is a no-op on web, so fall back to the browser dialogs there.
  const notify = (title: string, message?: string) => {
    if (Platform.OS === "web") {
      window.alert(message ? `${title}\n\n${message}` : title);
    } else {
      Alert.alert(title, message);
    }
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    if (Platform.OS === "web") {
      if (window.confirm(message ? `${title}\n\n${message}` : title)) {
        onConfirm();
      }
    } else {
      Alert.alert(title, message, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onConfirm },
      ]);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <EZHeaderTitle>History</EZHeaderTitle>,
    });
  }, [navigation]);

  const loadTransactions = async () => {
    setLoading(true);
    const [expenses, incomes] = await Promise.all([
      ExpenseService.getAllExpenses(user.id, user.activeWalletId),
      IncomeService.getAllIncomes(user.id, user.activeWalletId),
    ]);

    const merged: Txn[] = [
      ...expenses.map((e: any) => ({ ...e, kind: "expense" as Kind })),
      ...incomes.map((i: any) => ({ ...i, kind: "income" as Kind })),
    ].sort((a, b) => (a.payDate < b.payDate ? 1 : a.payDate > b.payDate ? -1 : b.id - a.id));

    setTransactions(merged);
    setLoading(false);
  };

  const ensureCategories = async () => {
    if (categories && categories.length) {
      return;
    }
    const all = await CategoryService.getUserCategories(user.id);
    if (all && all.length) {
      dispatch(setCategoriesAction(all));
    }
  };

  useEffect(() => {
    loadTransactions();
    ensureCategories();
  }, [user.activeWalletId]);

  const openEditor = (txn: Txn) => {
    setEditing(txn);
    setEditAmount(String(txn.amount).replace(".", ","));
    setEditDescription(txn.description ?? "");
    setEditCategoryId(txn.categoryId);
  };

  const closeEditor = () => {
    setEditing(null);
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const numericAmount = Number(editAmount.replace(",", "."));
    if (!numericAmount || numericAmount <= 0) {
      notify("Invalid amount", "Please enter an amount greater than 0.");
      return;
    }

    setSaving(true);
    try {
      if (editing.kind === "expense") {
        const category = categories.find((c: Category) => c.id === editCategoryId);
        await ExpenseService.updateExpense(editing.id, {
          amount: numericAmount,
          description: editDescription,
          categoryId: editCategoryId,
        });
        const patch = {
          id: editing.id,
          amount: numericAmount,
          description: editDescription,
          categoryId: editCategoryId,
          name: category?.name ?? editing.name,
          color: category?.color ?? editing.color,
        };
        dispatch(updateExpenseAction(patch));
        setTransactions((prev) =>
          prev.map((t) => (t.id === editing.id && t.kind === "expense" ? { ...t, ...patch } : t))
        );
      } else {
        await IncomeService.updateIncome(editing.id, {
          amount: numericAmount,
          description: editDescription,
        });
        const patch = { id: editing.id, amount: numericAmount, description: editDescription };
        dispatch(updateIncomeAction(patch));
        setTransactions((prev) =>
          prev.map((t) => (t.id === editing.id && t.kind === "income" ? { ...t, ...patch } : t))
        );
      }
      closeEditor();
    } catch (error) {
      console.log("saveEdit failed:", error);
      notify("Error", "Could not save the changes. Please try again.");
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!editing) return;
    confirmAction("Delete transaction", "This cannot be undone. Delete it?", () => deleteTxn());
  };

  const deleteTxn = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.kind === "expense") {
        await ExpenseService.deleteExpense(editing.id);
        dispatch(removeExpenseAction(editing.id));
      } else {
        await IncomeService.deleteIncome(editing.id);
        dispatch(removeIncomeAction(editing.id));
      }
      setTransactions((prev) =>
        prev.filter((t) => !(t.id === editing.id && t.kind === editing.kind))
      );
      closeEditor();
    } catch (error) {
      console.log("deleteTxn failed:", error);
      notify("Error", "Could not delete the transaction. Please try again.");
      setSaving(false);
    }
  };

  const visible = transactions.filter((t) => filter === "all" || t.kind === filter);

  return (
    <View flex={1}>
      <StatusBar style="light" />
      <View flex={1} pt={6} px={6}>
        {/* Filter */}
        <HStack bg={user.theme === "dark" ? "muted.50" : "muted.100"} borderRadius={12} p={1} mb={4}>
          {(["all", "expense", "income"] as Filter[]).map((f) => {
            const active = filter === f;
            return (
              <Pressable key={f} flex={1} onPress={() => setFilter(f)}>
                <View py={2} borderRadius={10} alignItems="center" bg={active ? "purple.700" : "transparent"}>
                  <Text fontFamily="SourceBold" fontSize={14} color={active ? "white" : "muted.500"}>
                    {f === "all" ? "All" : f === "expense" ? "Expenses" : "Income"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </HStack>

        {loading ? (
          <View flex={1} justifyContent="center" alignItems="center">
            <Spinner color="purple.700" size="lg" />
          </View>
        ) : visible.length === 0 ? (
          <View flex={1} justifyContent="center" alignItems="center">
            <Text fontSize={18} fontFamily="SourceSansPro" color="muted.400">
              No transactions yet
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <GroupedTransactionList
              transactions={visible}
              categories={categories}
              symbol={user.symbol}
              onPressTransaction={openEditor}
            />
          </ScrollView>
        )}
      </View>

      {/* Edit modal */}
      <Modal isOpen={!!editing} onClose={closeEditor} avoidKeyboard>
        <Modal.Content
          maxWidth="400px"
          width="92%"
          bg={user.theme === "dark" ? "#1f2937" : "white"}>
          <Modal.CloseButton _icon={{ color: user.theme === "dark" ? "#ffffff" : "#262626" }} />
          <Modal.Body>
            {editing && (
              <VStack space={4}>
                <Text fontFamily="SourceBold" fontSize={20}>
                  {editing.kind === "income" ? "Edit income" : "Edit expense"}
                </Text>

                <EZInput
                  style={authInput}
                  type="text"
                  keyboardType="decimal-pad"
                  label={`Amount ${user.symbol ?? ""}`}
                  placeholder="0"
                  value={editAmount}
                  onChangeText={setEditAmount}
                  borderRadius={12}
                  borderColor="muted.200"
                />

                {editing.kind === "expense" && (
                  <VStack space={2}>
                    <Text fontFamily="SourceBold" fontSize={16}>
                      Category
                    </Text>
                    <Box flexDirection="row" flexWrap="wrap" style={{ marginHorizontal: -4 }}>
                      {categories.map((c: Category) => {
                        const active = c.id === editCategoryId;
                        return (
                          <Pressable
                            key={c.id}
                            onPress={() => setEditCategoryId(c.id)}
                            style={{ margin: 4 }}>
                            <HStack
                              alignItems="center"
                              space={2}
                              px={3}
                              py={2}
                              borderRadius={12}
                              borderWidth={1.5}
                              borderColor={active ? COLORS.EMERALD[400] : "muted.200"}
                              bg={active ? "emerald.50" : "muted.50"}>
                              <Box
                                width="26px"
                                height="26px"
                                borderRadius={10}
                                justifyContent="center"
                                alignItems="center"
                                style={{ backgroundColor: c.color }}>
                                {renderCategoryIcon(c.icon, c.name, 15, "#fff")}
                              </Box>
                              <Text
                                fontFamily="SourceBold"
                                fontSize={14}
                                color={active ? "#262626" : undefined}>
                                {c.name}
                              </Text>
                            </HStack>
                          </Pressable>
                        );
                      })}
                    </Box>
                  </VStack>
                )}

                <EZInput
                  style={authInput}
                  type="text"
                  label={editing.kind === "income" ? "Note (optional)" : "Description (optional)"}
                  placeholder={editing.kind === "income" ? "Add a note" : "..."}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  borderRadius={12}
                  borderColor="muted.200"
                />

                <Divider bg="muted.200" />

                <HStack space={3}>
                  <EZButton
                    flex={1}
                    variant="outline"
                    onPress={confirmDelete}
                    borderColor="danger.500"
                    borderRadius={8}
                    height="44px"
                    _text={{ fontFamily: "SourceSansPro", fontSize: 16, color: COLORS.DANGER[500] }}
                    leftIcon={<Feather name="trash-2" size={18} color={COLORS.DANGER[500]} />}>
                    Delete
                  </EZButton>
                  <EZButton
                    flex={1}
                    variant="solid"
                    isLoading={saving}
                    onPress={saveEdit}
                    bg={editing.kind === "income" ? COLORS.EMERALD[500] : COLORS.PURPLE[700]}
                    borderRadius={8}
                    height="44px"
                    _text={{ fontFamily: "SourceSansPro", fontSize: 16 }}>
                    Save
                  </EZButton>
                </HStack>
              </VStack>
            )}
          </Modal.Body>
        </Modal.Content>
      </Modal>
    </View>
  );
};

export default TransactionsScreen;
