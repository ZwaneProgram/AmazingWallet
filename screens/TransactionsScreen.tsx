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
  Actionsheet,
} from "native-base";
import { Alert, Platform, TextInput, TouchableOpacity } from "react-native";
import { AntDesign, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp, ParamListBase } from "@react-navigation/native";
import moment from "moment";
import { getPeriodRange, formatPeriodLabel } from "../utils/period";
import CalendarModal from "../components/CalendarModal";
import EZHeaderTitle from "../components/shared/EzHeaderTitle";
import MonthYearPickerModal from "../components/MonthYearPickerModal";
import { useDispatch, useSelector } from "react-redux";
import { setActiveWalletAction } from "../redux/userReducer";
import { StatusBar } from "expo-status-bar";
import { RootState } from "../redux/store";
import COLORS from "../colors";
import { renderCategoryIcon } from "../utils/categoryIcons";
import { useAccent } from "../hooks/useAccent";
import { ExpenseService } from "../api/services/ExpenseService";
import { IncomeService } from "../api/services/IncomeService";
import { CategoryService } from "../api/services/CategoryService";
import { WalletService } from "../api/services/WalletService";
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
  walletsSelector,
} from "../redux/expensesReducers";

type Kind = "expense" | "income" | "transfer";
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
  walletId?: number;
  walletName?: string;
  walletColor?: string;
  // transfer-only
  fromWalletId?: number;
  toWalletId?: number;
  fromWalletName?: string;
  toWalletName?: string;
}

interface TransactionsScreenProps {
  navigation: NavigationProp<ParamListBase>;
}

const TransactionsScreen: React.FC<TransactionsScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch();
  const user: any = useSelector((state: RootState) => state.user);
  const categories = useSelector(categoriesSelector);
  const wallets = useSelector(walletsSelector);
  const accent = useAccent();

  const [loading, setLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  // Defaults to the wallet you're currently on; re-syncs when you switch wallets.
  // Picking a different wallet (or "All") here stays put until the active wallet changes.
  const [walletFilter, setWalletFilter] = useState<number | "all">(user.activeWalletId || "all");
  const [walletSheetOpen, setWalletSheetOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [histMode, setHistMode] = useState<"month" | "all" | "range">("month");
  const [histMonth, setHistMonth] = useState<string>(moment().format("MMMM"));
  const [histYear, setHistYear] = useState<number>(moment().year());
  const [monthPickerOpen, setMonthPickerOpen] = useState<boolean>(false);
  // Custom date-range filter (6.1b)
  const [rangeStart, setRangeStart] = useState<string>(moment().startOf("month").format("YYYY-MM-DD"));
  const [rangeEnd, setRangeEnd] = useState<string>(moment().format("YYYY-MM-DD"));
  const [rangeOpen, setRangeOpen] = useState<boolean>(false);

  // edit modal state
  const [editing, setEditing] = useState<Txn | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editCategoryId, setEditCategoryId] = useState<number | undefined>(undefined);
  const [editWalletId, setEditWalletId] = useState<number | undefined>(undefined);
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
    const [expenses, incomes, transfers] = await Promise.all([
      ExpenseService.getAllExpensesEveryWallet(user.id),
      IncomeService.getAllIncomesEveryWallet(user.id),
      WalletService.getAllTransfers(user.id),
    ]);

    const walletById = new Map<number, any>();
    (wallets ?? []).forEach((w: any) => w.id != null && walletById.set(w.id, w));
    const tagWallet = (row: any) => {
      const w = row.walletId != null ? walletById.get(row.walletId) : undefined;
      return { ...row, walletName: w?.name, walletColor: w?.color };
    };

    const merged: Txn[] = [
      ...expenses.map((e: any) => ({ ...tagWallet(e), kind: "expense" as Kind })),
      ...incomes.map((i: any) => ({ ...tagWallet(i), kind: "income" as Kind })),
      ...transfers.map((t: any) => ({
        ...t,
        kind: "transfer" as Kind,
        fromWalletName: walletById.get(t.fromWalletId)?.name,
        toWalletName: walletById.get(t.toWalletId)?.name,
      })),
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
  }, [user.activeWalletId, wallets]);

  // Follow the active wallet: switching wallet on Home makes History show that
  // wallet too. Manual changes within History persist until the active wallet
  // changes again.
  useEffect(() => {
    if (user.activeWalletId) {
      setWalletFilter(user.activeWalletId);
    }
  }, [user.activeWalletId]);

  const openEditor = (txn: Txn) => {
    // Transfers aren't edited inline — tapping one offers to delete (which
    // cleanly reverses the moved balance).
    if (txn.kind === "transfer") {
      confirmAction(
        "Delete transfer",
        `Remove the transfer of ${user.symbol ?? ""} ${txn.amount.toFixed(2)} from ${
          txn.fromWalletName ?? "wallet"
        } to ${txn.toWalletName ?? "wallet"}?`,
        () => deleteTransfer(txn.id)
      );
      return;
    }
    setEditing(txn);
    setEditAmount(String(txn.amount).replace(".", ","));
    setEditDescription(txn.description ?? "");
    setEditCategoryId(txn.categoryId);
    setEditWalletId(txn.walletId);
  };

  const deleteTransfer = async (id: number) => {
    try {
      await WalletService.deleteTransfer(id);
      setTransactions((prev) => prev.filter((t) => !(t.id === id && t.kind === "transfer")));
    } catch (error) {
      console.log("deleteTransfer failed:", error);
      notify("Error", "Could not delete the transfer. Please try again.");
    }
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

    const wallet = (wallets ?? []).find((w: any) => w.id === editWalletId);
    const walletPatch = {
      walletId: editWalletId,
      walletName: wallet?.name,
      walletColor: wallet?.color,
    };

    setSaving(true);
    try {
      if (editing.kind === "expense") {
        const category = categories.find((c: Category) => c.id === editCategoryId);
        await ExpenseService.updateExpense(editing.id, {
          amount: numericAmount,
          description: editDescription,
          categoryId: editCategoryId,
          walletId: editWalletId,
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
          prev.map((t) =>
            t.id === editing.id && t.kind === "expense" ? { ...t, ...patch, ...walletPatch } : t
          )
        );
      } else {
        const category = categories.find((c: Category) => c.id === editCategoryId);
        await IncomeService.updateIncome(editing.id, {
          amount: numericAmount,
          description: editDescription,
          walletId: editWalletId,
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
        dispatch(updateIncomeAction(patch));
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === editing.id && t.kind === "income" ? { ...t, ...patch, ...walletPatch } : t
          )
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

  const monthRange = getPeriodRange(histMonth, histYear, user.cycleStartDay || 1);
  const periodStart =
    histMode === "all"
      ? moment().year(histYear).startOf("year").format("YYYY-MM-DD")
      : histMode === "range"
      ? rangeStart
      : monthRange.start;
  const periodEnd =
    histMode === "all"
      ? moment().year(histYear).endOf("year").format("YYYY-MM-DD")
      : histMode === "range"
      ? rangeEnd
      : monthRange.end;
  const periodLabel =
    histMode === "all"
      ? `All ${histYear}`
      : histMode === "range"
      ? `${moment(rangeStart).format("MMM D")} – ${moment(rangeEnd).format("MMM D, YYYY")}`
      : (user.cycleStartDay || 1) > 1
      ? formatPeriodLabel(histMonth, histYear, user.cycleStartDay || 1)
      : `${histMonth} ${histYear}`;
  const query = search.trim().toLowerCase();

  // Arrows page months in month-mode, and years in all-mode.
  const shiftPeriod = (delta: number) => {
    if (histMode === "all") {
      setHistYear((y) => y + delta);
      return;
    }
    const next = moment().year(histYear).month(moment(histMonth, "MMMM").month()).add(delta, "month");
    setHistMonth(next.format("MMMM"));
    setHistYear(next.year());
  };

  const visible = transactions.filter((t) => {
    // Only the selected period (a single month, or a whole year when "All").
    if (t.payDate < periodStart || t.payDate > periodEnd) return false;
    // Free-text search over the note/description.
    if (query && !(t.description ?? "").toLowerCase().includes(query)) return false;
    // Expenses/Income filter hides transfers (they're neither).
    if (filter !== "all" && t.kind !== filter) return false;
    if (walletFilter === "all") return true;
    if (t.kind === "transfer") {
      return t.fromWalletId === walletFilter || t.toWalletId === walletFilter;
    }
    return t.walletId === walletFilter;
  });

  const isDark = user.theme === "dark";
  const selectedWallet =
    walletFilter === "all" ? null : (wallets ?? []).find((w: any) => w.id === walletFilter);
  const sheetBg = isDark ? "#1f2937" : "#ffffff";

  return (
    <View flex={1}>
      <StatusBar style="light" />
      <View flex={1} pt={6} px={6}>
        {/* Period picker — page through months (or years when viewing "All") */}
        <HStack alignItems="center" justifyContent="space-between" mb={3}>
          <TouchableOpacity
            disabled={histMode === "range"}
            onPress={() => shiftPeriod(-1)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AntDesign
              name="left"
              size={22}
              color={histMode === "range" ? COLORS.MUTED[300] : accent[700]}
            />
          </TouchableOpacity>
          <Pressable onPress={() => setMonthPickerOpen(true)} _pressed={{ opacity: 0.6 }}>
            <HStack
              space={2}
              alignItems="center"
              px={4}
              py={2}
              borderRadius={20}
              bg={isDark ? "muted.50" : "muted.100"}>
              <Feather
                name="calendar"
                size={14}
                color={isDark ? COLORS.MUTED[300] : COLORS.MUTED[500]}
              />
              <Text fontFamily="SourceBold" fontSize={16}>
                {periodLabel}
              </Text>
              <AntDesign
                name="caret-down"
                size={10}
                color={isDark ? COLORS.MUTED[300] : COLORS.MUTED[500]}
              />
            </HStack>
          </Pressable>
          <TouchableOpacity
            disabled={histMode === "range"}
            onPress={() => shiftPeriod(1)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AntDesign
              name="right"
              size={22}
              color={histMode === "range" ? COLORS.MUTED[300] : accent[700]}
            />
          </TouchableOpacity>
        </HStack>

        {/* Custom date-range toggle (6.1b) */}
        <Pressable
          alignSelf="center"
          mb={3}
          onPress={() => {
            if (histMode === "range") {
              // back to the current monthly view
              setHistMode("month");
              setHistMonth(moment().format("MMMM"));
              setHistYear(moment().year());
            } else {
              setRangeOpen(true);
            }
          }}
          _pressed={{ opacity: 0.6 }}>
          <HStack alignItems="center" space={1}>
            <Feather
              name={histMode === "range" ? "x" : "sliders"}
              size={13}
              color={accent[700]}
            />
            <Text fontFamily="SourceBold" fontSize={13} color={accent[700]}>
              {histMode === "range" ? "Clear custom range" : "Custom range…"}
            </Text>
          </HStack>
        </Pressable>

        {/* Search notes */}
        <HStack
          alignItems="center"
          space={2}
          bg={isDark ? "muted.50" : "muted.100"}
          borderRadius={12}
          px={4}
          py={Platform.OS === "ios" ? 3 : 1.5}
          mb={3}>
          <Feather name="search" size={18} color={isDark ? COLORS.MUTED[300] : COLORS.MUTED[500]} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search notes"
            placeholderTextColor={isDark ? COLORS.MUTED[400] : COLORS.MUTED[400]}
            style={{
              flex: 1,
              fontFamily: "SourceSansPro",
              fontSize: 16,
              color: isDark ? "#ffffff" : "#262626",
            }}
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch("")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={18} color={isDark ? COLORS.MUTED[300] : COLORS.MUTED[500]} />
            </TouchableOpacity>
          )}
        </HStack>

        {/* Wallet filter */}
        <Pressable onPress={() => setWalletSheetOpen(true)} mb={3}>
          <HStack
            bg={isDark ? "muted.50" : "muted.100"}
            borderRadius={12}
            px={4}
            py={3}
            alignItems="center"
            justifyContent="space-between">
            <HStack space={2} alignItems="center" flex={1}>
              {selectedWallet ? (
                renderCategoryIcon(
                  selectedWallet.icon ?? "cash",
                  selectedWallet.name,
                  20,
                  selectedWallet.color || accent[700]
                )
              ) : (
                <MaterialCommunityIcons
                  name="wallet-outline"
                  size={20}
                  color={isDark ? COLORS.MUTED[300] : COLORS.MUTED[500]}
                />
              )}
              <Text fontFamily="SourceBold" fontSize={16} numberOfLines={1}>
                {selectedWallet ? selectedWallet.name : "All wallets"}
              </Text>
            </HStack>
            <Feather
              name="chevron-down"
              size={20}
              color={isDark ? COLORS.MUTED[300] : COLORS.MUTED[500]}
            />
          </HStack>
        </Pressable>

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
          <View flex={1} justifyContent="center" alignItems="center" px={6}>
            <Text fontSize={18} fontFamily="SourceSansPro" color="muted.400" textAlign="center">
              {query
                ? `No notes matching "${search.trim()}"`
                : `No transactions in ${periodLabel}`}
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <GroupedTransactionList
              transactions={visible}
              categories={categories}
              symbol={user.symbol}
              walletPerspective={walletFilter === "all" ? undefined : walletFilter}
              onPressTransaction={openEditor}
            />
          </ScrollView>
        )}
      </View>

      {/* Period picker: each month, plus an "All <year>" option */}
      <MonthYearPickerModal
        isOpen={monthPickerOpen}
        onClose={() => setMonthPickerOpen(false)}
        month={histMonth}
        year={histYear}
        allActive={histMode === "all"}
        onSelect={(month, year) => {
          setHistMode("month");
          setHistMonth(month);
          setHistYear(year);
        }}
        onSelectAll={(year) => {
          setHistMode("all");
          setHistYear(year);
        }}
      />

      {/* Custom date-range picker (6.1b) */}
      <CalendarModal
        isOpen={rangeOpen}
        onClose={() => setRangeOpen(false)}
        mode="range"
        startValue={rangeStart}
        endValue={rangeEnd}
        title="Filter by date range"
        onSelectRange={(start, end) => {
          setRangeStart(start);
          setRangeEnd(end);
          setHistMode("range");
        }}
      />

      {/* Wallet filter sheet */}
      <Actionsheet isOpen={walletSheetOpen} onClose={() => setWalletSheetOpen(false)}>
        <Actionsheet.Content bg={sheetBg} style={{ backgroundColor: sheetBg, paddingBottom: 8 }}>
          {(
            [
              { key: "all" as const, name: "All wallets", icon: null, color: null },
              ...(wallets ?? []).map((w: any) => ({
                key: w.id as number,
                name: w.name,
                icon: w.icon,
                color: w.color,
              })),
            ]
          ).map((opt) => {
            const active = walletFilter === opt.key;
            const activeBg = isDark ? "#3b2e63" : accent[100];
            const activeTint = isDark ? accent[300] : accent[700];
            return (
              <TouchableOpacity
                key={String(opt.key)}
                activeOpacity={0.6}
                onPress={() => {
                  // Picking a specific wallet switches the app-wide active wallet
                  // (mirrors Home). "All wallets" is a History-only view, so it
                  // doesn't change the active wallet.
                  if (opt.key !== "all") {
                    dispatch(setActiveWalletAction(opt.key));
                  }
                  setWalletFilter(opt.key);
                  setWalletSheetOpen(false);
                }}
                style={{
                  height: 56,
                  width: "100%",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  backgroundColor: active ? activeBg : "transparent",
                }}>
                <HStack space={3} alignItems="center" flex={1}>
                  {opt.key === "all" ? (
                    <MaterialCommunityIcons
                      name="wallet-outline"
                      size={22}
                      color={active ? activeTint : isDark ? COLORS.MUTED[300] : COLORS.MUTED[500]}
                    />
                  ) : (
                    renderCategoryIcon(opt.icon ?? "cash", opt.name, 22, opt.color || accent[700])
                  )}
                  <Text
                    fontFamily="SourceSansPro"
                    fontSize={17}
                    color={active ? activeTint : isDark ? "#ffffff" : "#262626"}>
                    {opt.name}
                  </Text>
                </HStack>
                {active && <Feather name="check" size={18} color={activeTint} />}
              </TouchableOpacity>
            );
          })}
        </Actionsheet.Content>
      </Actionsheet>

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

                {(
                  <VStack space={2}>
                    <Text fontFamily="SourceBold" fontSize={16}>
                      {editing.kind === "income" ? "Category (optional)" : "Category"}
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
                                style={{ backgroundColor: c.color || "#7e22ce" }}>
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

                {(wallets ?? []).length > 1 && (
                  <VStack space={2}>
                    <Text fontFamily="SourceBold" fontSize={16}>
                      Wallet
                    </Text>
                    <Box flexDirection="row" flexWrap="wrap" style={{ marginHorizontal: -4 }}>
                      {(wallets as any[]).map((w: any) => {
                        const active = w.id === editWalletId;
                        return (
                          <Pressable
                            key={w.id}
                            onPress={() => setEditWalletId(w.id)}
                            style={{ margin: 4 }}>
                            <HStack
                              alignItems="center"
                              space={2}
                              px={3}
                              py={2}
                              borderRadius={12}
                              borderWidth={1.5}
                              borderColor={active ? accent[400] : "muted.200"}
                              bg={active ? (isDark ? "rgba(168,85,247,0.18)" : "purple.50") : "muted.50"}>
                              {renderCategoryIcon(w.icon ?? "cash", w.name, 18, w.color || accent[700])}
                              <Text
                                fontFamily="SourceBold"
                                fontSize={14}
                                color={
                                  active
                                    ? isDark
                                      ? accent[300]
                                      : accent[700]
                                    : undefined
                                }>
                                {w.name}
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
                    bg={editing.kind === "income" ? COLORS.EMERALD[500] : accent[700]}
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
