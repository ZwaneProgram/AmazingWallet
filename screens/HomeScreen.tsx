import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Box,
  VStack,
  Fab,
  Icon,
  Skeleton,
  HStack,
  ScrollView,
  Divider,
  Pressable,
} from "native-base";
import { NavigationProp, ParamListBase, useIsFocused } from "@react-navigation/native";
import { AntDesign } from "@expo/vector-icons";
import { TAB_BAR_HEIGHT } from "../constants/NavigationConstants";
import { ExpenseService } from "../api/services/ExpenseService";
import { IncomeService } from "../api/services/IncomeService";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { CategoryService } from "../api/services/CategoryService";
import EZButton from "../components/shared/EZButton";
import { SetBudget } from "../assets/SVG";
import MonthlyBudgetCategory from "../components/MonthlyBudgetCategory";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Feather } from "@expo/vector-icons";
import COLORS from "../colors";
import { UserService } from "../api/services/UserService";
import { Budget } from "../interfaces/Budget";
import { StatusBar } from "expo-status-bar";
import {
  categoriesSelector,
  categoryRollupSelector,
  monthIncomeTotalSelector,
  monthlyBudgetsSelector,
  monthTotalSelector,
  setBudgetsAction,
  setCategoriesAction,
  setExpensesAction,
  setIncomesAction,
  setWalletsAction,
  setWalletGroupsAction,
  setMonthlyCostsAction,
  walletsSelector,
  walletGroupsSelector,
  monthlyCostsSelector,
} from "../redux/expensesReducers";
import { LinearGradient } from "expo-linear-gradient";
import moment from "moment";
import { setActiveWalletAction, setMonthAction, setYearAction } from "../redux/userReducer";
import MonthYearPickerModal from "../components/MonthYearPickerModal";
import WalletPickerSheet from "../components/WalletPickerSheet";
import TransferModal from "../components/TransferModal";
import GroupedTransactionList from "../components/GroupedTransactionList";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WalletService } from "../api/services/WalletService";
import { WalletGroupService } from "../api/services/WalletGroupService";
import { MonthlyCostService } from "../api/services/MonthlyCostService";
import { MonthlyCost } from "../interfaces/MonthlyCost";
import { dueDayArrived, isSnoozedToday, payMonthlyCost, snoozeMonthlyCost } from "../utils/monthlyCosts";
import { useAccent } from "../hooks/useAccent";
import { getPeriodRange, formatPeriodLabel } from "../utils/period";

interface HomeScreenProps {
  navigation: NavigationProp<ParamListBase>;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const isFocused = useIsFocused();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState<boolean>(false);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [walletSheetOpen, setWalletSheetOpen] = useState<boolean>(false);
  const [transferOpen, setTransferOpen] = useState<boolean>(false);
  const [walletBalances, setWalletBalances] = useState<Record<number, number>>({});
  const { expenses } = useSelector((state: RootState) => state.expenses);
  const incomes = useSelector((state: RootState) => state.expenses.incomes);
  const categories = useSelector(categoriesSelector);
  const monthTotal = useSelector(monthTotalSelector);
  const monthIncomeTotal = useSelector(monthIncomeTotalSelector);
  // Hero number: this period's net (income - expenses). Green when up, red when down.
  const monthNet = (monthIncomeTotal || 0) - (monthTotal || 0);
  const monthlyBudgets = useSelector(monthlyBudgetsSelector);
  const rollup = useSelector(categoryRollupSelector);
  const wallets = useSelector(walletsSelector);
  const walletGroups = useSelector(walletGroupsSelector);
  const monthlyCosts = useSelector(monthlyCostsSelector);

  const user: any = useSelector((state: RootState) => state.user);
  const accent = useAccent();

  const recentTransactions = useMemo(() => {
    const merged: any[] = [
      ...expenses.map((e: any) => ({ ...e, kind: "expense" })),
      ...incomes.map((i: any) => ({ ...i, kind: "income" })),
    ].sort((a, b) => {
      // Newest day first, then newest-logged first (created_at), then id.
      if (a.payDate !== b.payDate) return a.payDate < b.payDate ? 1 : -1;
      const ac = a.createdAt ?? "";
      const bc = b.createdAt ?? "";
      if (ac !== bc) return ac < bc ? 1 : -1;
      return (b.id ?? 0) - (a.id ?? 0);
    });
    return merged.slice(0, 10);
  }, [expenses, incomes]);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <View style={{ height: 138 + insets.top }}>
          <LinearGradient
            colors={
              user.theme === "light"
                ? [accent[900], accent[600]]
                : ["#111827", "#1f2937"]
            }
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "flex-end",
              paddingTop: insets.top,
            }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}>
            <VStack space={3} pb={4}>
              {loading ? (
                <VStack space={2} alignItems="center">
                  <Skeleton h="6" w={28} rounded="full" startColor="indigo.300" />
                  <Skeleton h="7" w={40} rounded="full" startColor="indigo.300" />
                </VStack>
              ) : (
                <VStack space={0.5} alignItems="center">
                  <Text
                    fontFamily="SourceBold"
                    color="white"
                    fontSize={11}
                    letterSpacing={3}
                    opacity={0.65}>
                    THIS MONTH
                  </Text>
                  <Text
                    fontFamily="SourceBold"
                    fontSize={28}
                    style={{ color: monthNet >= 0 ? COLORS.EMERALD[400] : COLORS.DANGER[400] }}>
                    {monthNet >= 0 ? "+" : "-"} {user.symbol} {Math.abs(monthNet).toFixed(2)}
                  </Text>
                </VStack>
              )}
              <HStack space={2} alignSelf="center">
                <Pressable onPress={() => setPickerOpen(true)}>
                  <HStack
                    space={1.5}
                    alignItems="center"
                    px={3.5}
                    py={1.5}
                    borderRadius={20}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.14)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.2)",
                    }}>
                    <Feather name="calendar" size={13} color={COLORS.MUTED[50]} />
                    <Text fontFamily="SourceBold" color="white" fontSize={15}>
                      {periodLabel}
                    </Text>
                    <AntDesign name="caret-down" size={10} color={COLORS.MUTED[50]} />
                  </HStack>
                </Pressable>
                <Pressable onPress={() => setWalletSheetOpen(true)}>
                  <HStack
                    space={1.5}
                    alignItems="center"
                    px={3.5}
                    py={1.5}
                    borderRadius={20}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.14)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.2)",
                    }}>
                    <MaterialCommunityIcons name="wallet-outline" size={14} color={COLORS.MUTED[50]} />
                    <Text fontFamily="SourceBold" color="white" fontSize={15}>
                      {(wallets as any[]).find((w: any) => w.id === user.activeWalletId)?.name ?? "Wallet"}
                    </Text>
                    <AntDesign name="caret-down" size={10} color={COLORS.MUTED[50]} />
                  </HStack>
                </Pressable>
              </HStack>
            </VStack>
          </LinearGradient>
        </View>
      ),
    });
  }, [navigation, monthNet, loading, user.month, user.year, user.activeWalletId, wallets, insets.top, user.theme, accent]);

  useEffect(() => {
    if (!expenses.length) {
      getGeneralInfo();
    }
  }, [user]);

  // All-time balance per wallet (income - expense across every month), loaded
  // when the wallet sheet opens so the figures are always current.
  const loadWalletBalances = async () => {
    const [exp, inc, transfers] = await Promise.all([
      ExpenseService.getAllExpensesEveryWallet(user.id),
      IncomeService.getAllIncomesEveryWallet(user.id),
      WalletService.getAllTransfers(user.id),
    ]);
    const map: Record<number, number> = {};
    (wallets as any[]).forEach((w: any) => w.id != null && (map[w.id] = 0));
    inc.forEach((i: any) => {
      if (i.walletId != null) map[i.walletId] = (map[i.walletId] ?? 0) + Number(i.amount);
    });
    exp.forEach((e: any) => {
      if (e.walletId != null) map[e.walletId] = (map[e.walletId] ?? 0) - Number(e.amount);
    });
    transfers.forEach((t: any) => {
      if (t.fromWalletId != null) map[t.fromWalletId] = (map[t.fromWalletId] ?? 0) - Number(t.amount);
      if (t.toWalletId != null) map[t.toWalletId] = (map[t.toWalletId] ?? 0) + Number(t.amount);
    });
    setWalletBalances(map);
  };

  // Refresh balances whenever the screen regains focus (after adding a
  // transaction, a transfer, switching wallet, etc.) or the sheet opens, so the
  // Home "Balance" always reflects the wallet's true running balance.
  useEffect(() => {
    if (isFocused) {
      loadWalletBalances();
    }
  }, [isFocused, walletSheetOpen, user.activeWalletId]);

  // Wallets flagged "exclude from total" are skipped from the combined balance
  // shown in the wallet picker (but still show their own numbers when viewed).
  const excludedWalletIds = new Set(
    (wallets as any[]).filter((w: any) => w.excludeFromTotal).map((w: any) => w.id)
  );
  const totalWalletBalance = Object.entries(walletBalances).reduce(
    (sum, [id, bal]) => (excludedWalletIds.has(Number(id)) ? sum : sum + bal),
    0
  );
  const activeWalletBalance = walletBalances[user.activeWalletId] ?? 0;

  const getAllCategories = async () => {
    return await CategoryService.getUserCategories(user.id);
  };

  const getMonthlyBudgets = async (userId: number, walletId: number) => {
    const budgets = await UserService.getUserBudgets(userId, walletId);

    return budgets;
  };

  const selectedYear = user.year || moment().year();
  const cycleStartDay = user.cycleStartDay || 1;
  const { start: startOfMonth, end: endOfMonth } = getPeriodRange(
    user.month,
    selectedYear,
    cycleStartDay
  );
  // Calendar cycle -> "June 2026"; shifted cycle -> the explicit span.
  const periodLabel =
    cycleStartDay > 1
      ? formatPeriodLabel(user.month, selectedYear, cycleStartDay)
      : `${user.month} ${selectedYear}`;

  const getMonthlyExpenses = async (userId: number, startOfMonth: string, endOfMonth: string, walletId: number) => {
    const expenses = await ExpenseService.getMonthExpenses(userId, startOfMonth, endOfMonth, walletId);
    return expenses;
  };

  const getMonthlyIncomes = async (userId: number, startOfMonth: string, endOfMonth: string, walletId: number) => {
    const incomes = await IncomeService.getMonthIncomes(userId, startOfMonth, endOfMonth, walletId);
    return incomes;
  };

  const getGeneralInfo = async () => {
    setLoading(true);

    const [allWallets, groups, costs] = await Promise.all([
      WalletService.getUserWallets(user.id),
      WalletGroupService.getUserGroups(user.id),
      MonthlyCostService.getUserMonthlyCosts(user.id),
    ]);
    dispatch(setWalletsAction(allWallets));
    dispatch(setWalletGroupsAction(groups));
    dispatch(setMonthlyCostsAction(costs));
    let walletId = user.activeWalletId;
    if (!walletId || !allWallets.some((w) => w.id === walletId)) {
      const def = allWallets.find((w) => w.isDefault) ?? allWallets[0];
      walletId = def?.id ?? 0;
      dispatch(setActiveWalletAction(walletId));
    }

    const [categories, budgets, expenses, incomes] = await Promise.all([
      getAllCategories(),
      getMonthlyBudgets(user.id, walletId),
      getMonthlyExpenses(user.id, startOfMonth, endOfMonth, walletId),
      getMonthlyIncomes(user.id, startOfMonth, endOfMonth, walletId),
    ]);

    dispatch(setCategoriesAction(categories));
    dispatch(setBudgetsAction(budgets.filter((item: Budget) => item.budget !== 0)));
    dispatch(setExpensesAction(expenses));
    dispatch(setIncomesAction(incomes));

    setLoading(false);
  };

  // Rolled-up spend for a (parent) category: its own expenses + all its sub-categories'.
  const getCategoryMonthlyTotal = (category: string) => {
    const entry = (rollup as any[]).find((r) => r.name === category);
    return entry ? entry.effectiveTotal : 0;
  };

  // Budget cards show parent categories only; sub-category budget rows (if any old ones
  // exist in the DB) are ignored here since subs roll up into their parent.
  const parentBudgets = (monthlyBudgets as Budget[]).filter((b: Budget) => {
    const cat = (categories as any[]).find((c: any) => c.id === b.id);
    return !cat || !cat.parentId;
  });

  const openAddExpenseModal = () => {
    navigation.navigate("AddExpense");
  };

  const openEditBudgetsModal = () => {
    navigation.navigate("EditBudgets");
  };

  // Monthly costs whose due day has arrived this month and aren't paid. Snoozed
  // ones stay in the list (shown as a reminder) instead of disappearing.
  const dueCosts = (monthlyCosts as MonthlyCost[]).filter((c) => dueDayArrived(c));
  const costDayLabel = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const refreshMonthlyCosts = async () => {
    const data = await MonthlyCostService.getUserMonthlyCosts(user.id);
    dispatch(setMonthlyCostsAction(data));
  };

  const handlePayDue = async (cost: MonthlyCost) => {
    try {
      await payMonthlyCost(cost, categories, dispatch, user.activeWalletId);
      await refreshMonthlyCosts();
      loadWalletBalances();
    } catch (e) {
      console.log("pay due cost failed:", e);
    }
  };

  const handleSnoozeDue = async (cost: MonthlyCost) => {
    try {
      await snoozeMonthlyCost(cost);
      await refreshMonthlyCosts();
    } catch (e) {
      console.log("snooze due cost failed:", e);
    }
  };

  const applyPeriod = async (month: string, year: number, walletId: number = user.activeWalletId) => {
    const parsedMonth = moment(month, "MMMM");
    if (!parsedMonth.isValid()) {
      return;
    }

    dispatch(setMonthAction(parsedMonth.format("MMMM")));
    dispatch(setYearAction(year));

    const { start: startOfMonth, end: endOfMonth } = getPeriodRange(
      parsedMonth.format("MMMM"),
      year,
      cycleStartDay
    );

    setLoading(true);
    const [expenses, incomes] = await Promise.all([
      getMonthlyExpenses(user.id, startOfMonth, endOfMonth, walletId),
      getMonthlyIncomes(user.id, startOfMonth, endOfMonth, walletId),
    ]);
    dispatch(setExpensesAction(expenses));
    dispatch(setIncomesAction(incomes));
    setLoading(false);
  };

  const activeWallet = (wallets as any[]).find((w: any) => w.id === user.activeWalletId);
  const overallBudget = activeWallet?.overallBudget ?? 0;
  const overallPct = overallBudget > 0 ? Math.min((monthTotal / overallBudget) * 100, 100) : 0;
  const overBudget = overallBudget > 0 && monthTotal > overallBudget;

  // Budget-usage colour ramp: calm green -> deeper green -> amber -> red as you
  // approach (and pass) the limit. Drives both the bar and the spent amount.
  const budgetColor =
    overallPct >= 85
      ? COLORS.DANGER[500]
      : overallPct >= 80
      ? COLORS.YELLOW[400]
      : overallPct >= 50
      ? COLORS.EMERALD[700]
      : COLORS.EMERALD[500];

  return (
    <View flex={1}>
      <StatusBar style="light" />
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <View flex={1} pt={10} px={7}>
          <VStack space={8}>
            {overallBudget > 0 && (
              <Box bg="muted.50" borderRadius={16} shadow={2} px={5} py={4}>
                <VStack mb={2} space={0.5}>
                  <Text fontFamily="SourceBold" fontSize={18}>
                    Overall budget
                  </Text>
                  <Text fontFamily="SourceBold" fontSize={15} color="muted.500">
                    <Text style={{ color: budgetColor }}>
                      {user.symbol} {monthTotal.toFixed(2)}
                    </Text>
                    {" / "}
                    {user.symbol} {Number(overallBudget).toFixed(2)}
                  </Text>
                </VStack>
                <Box bg="muted.200" height="12px" borderRadius={20} overflow="hidden">
                  <Box
                    height="12px"
                    borderRadius={20}
                    width={`${overallPct}%`}
                    style={{ backgroundColor: budgetColor }}
                  />
                </Box>
                {overBudget && (
                  <Text fontFamily="SourceSansPro" fontSize={13} color="danger.500" mt={1}>
                    Over budget by {user.symbol} {(monthTotal - overallBudget).toFixed(2)}
                  </Text>
                )}
              </Box>
            )}
            <Box bg="muted.50" borderRadius={16} shadow={2} px={5} py={4}>
              <HStack justifyContent="space-between">
                <VStack space={1}>
                  <HStack space={1} alignItems="center">
                    <Feather name="arrow-down-left" size={14} color={COLORS.EMERALD[500]} />
                    <Text color="muted.400" fontFamily="SourceSansPro" fontSize={14}>
                      Income
                    </Text>
                  </HStack>
                  <Text color="emerald.500" fontFamily="SourceBold" fontSize={20}>
                    {user.symbol} {(monthIncomeTotal || 0).toFixed(2)}
                  </Text>
                </VStack>
                <VStack space={1} alignItems="flex-end">
                  <HStack space={1} alignItems="center">
                    <Feather name="arrow-up-right" size={14} color={COLORS.DANGER[500]} />
                    <Text color="muted.400" fontFamily="SourceSansPro" fontSize={14}>
                      Expenses
                    </Text>
                  </HStack>
                  <Text color="danger.500" fontFamily="SourceBold" fontSize={20}>
                    {user.symbol} {(monthTotal || 0).toFixed(2)}
                  </Text>
                </VStack>
              </HStack>
              <Divider my={3} bg="muted.200" />
              <HStack justifyContent="space-between" alignItems="center">
                <VStack>
                  <Text fontFamily="SourceBold" fontSize={18}>
                    Balance
                  </Text>
                  <Text fontFamily="SourceSansPro" fontSize={12} color="muted.400">
                    {activeWallet?.name ?? "Wallet"} · all-time
                  </Text>
                </VStack>
                <Text
                  fontFamily="SourceBold"
                  fontSize={24}
                  color={activeWalletBalance >= 0 ? "emerald.500" : "danger.500"}>
                  {user.symbol} {activeWalletBalance.toFixed(2)}
                </Text>
              </HStack>
            </Box>
            {/* Monthly costs due — only shows when something needs paying */}
            {dueCosts.length > 0 && (
              <VStack space={3}>
                <HStack justifyContent="space-between" alignItems="center">
                  <Text fontFamily="SourceBold" fontSize={25}>
                    Monthly costs
                  </Text>
                  <Pressable
                    onPress={() => navigation.navigate("MonthlyCosts")}
                    _pressed={{ opacity: 0.5 }}>
                    <Text fontFamily="SourceBold" color={accent[700]} fontSize={15}>
                      Manage
                    </Text>
                  </Pressable>
                </HStack>

                {dueCosts.map((c) => {
                  const isIncome = c.type === "income";
                  const tint = isIncome ? COLORS.EMERALD[500] : COLORS.DANGER[500];
                  const snoozed = isSnoozedToday(c);
                  const wName = (wallets as any[]).find((w) => w.id === c.walletId)?.name ?? "";
                  return (
                    <Box key={c.id} bg="muted.50" borderRadius={14} shadow={1} px={4} py={3}>
                      <HStack justifyContent="space-between" alignItems="center">
                        <VStack flex={1} pr={2}>
                          <Text fontFamily="SourceBold" fontSize={16} numberOfLines={1}>
                            {c.name}
                          </Text>
                          <Text fontFamily="SourceSansPro" fontSize={12} color="muted.400" numberOfLines={1}>
                            Due the {costDayLabel(c.dayOfMonth)}
                            {wName ? ` · ${wName}` : ""}
                          </Text>
                        </VStack>
                        <Text fontFamily="SourceBold" fontSize={16} style={{ color: tint }}>
                          {isIncome ? "+" : "-"} {user.symbol} {c.amount.toFixed(2)}
                        </Text>
                      </HStack>
                      {snoozed ? (
                        <VStack mt={3} space={2}>
                          <HStack alignItems="center" space={1}>
                            <Feather name="clock" size={13} color={COLORS.MUTED[400]} />
                            <Text fontFamily="SourceSansPro" fontSize={13} color="muted.400">
                              Reminder — back tomorrow
                            </Text>
                          </HStack>
                          <Pressable onPress={() => handlePayDue(c)} _pressed={{ opacity: 0.7 }}>
                            <Box bg={tint} borderRadius={10} py={2.5} alignItems="center">
                              <Text fontFamily="SourceBold" fontSize={14} color="white">
                                {isIncome ? "Received it" : "Paid it"}
                              </Text>
                            </Box>
                          </Pressable>
                        </VStack>
                      ) : (
                        <HStack space={2} mt={3}>
                          <Pressable flex={1} onPress={() => handlePayDue(c)} _pressed={{ opacity: 0.7 }}>
                            <Box bg={tint} borderRadius={10} py={2.5} alignItems="center">
                              <Text fontFamily="SourceBold" fontSize={14} color="white">
                                {isIncome ? "Received it" : "Paid it"}
                              </Text>
                            </Box>
                          </Pressable>
                          <Pressable onPress={() => handleSnoozeDue(c)} _pressed={{ opacity: 0.7 }}>
                            <Box
                              borderWidth={1.5}
                              borderColor="muted.300"
                              borderRadius={10}
                              py={2.5}
                              px={4}
                              alignItems="center">
                              <Text fontFamily="SourceBold" fontSize={14} color="muted.500">
                                Tomorrow
                              </Text>
                            </Box>
                          </Pressable>
                        </HStack>
                      )}
                    </Box>
                  );
                })}
              </VStack>
            )}

            {isFocused && (
              <Fab
                onPress={openAddExpenseModal}
                width="56px"
                height="56px"
                right={"20px"}
                _pressed={{ bg: "purple.600" }}
                bg="purple.700"
                bottom={`${TAB_BAR_HEIGHT + insets.bottom + 20}px`}
                icon={<Icon color="white" size={26} as={<AntDesign name="plus" />} />}
              />
            )}
            <VStack space={3}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontFamily="SourceBold" fontSize={25}>
                  History
                </Text>
                {recentTransactions.length > 0 && (
                  <Pressable
                    flexShrink={0}
                    _pressed={{ opacity: 0.4 }}
                    onPress={() => navigation.navigate("History")}>
                    <HStack alignItems="center" space={1} flexShrink={0}>
                      <Text
                        fontFamily="SourceBold"
                        color={accent[700]}
                        fontSize={17}
                        numberOfLines={1}>
                        View all
                      </Text>
                      <Feather name="chevron-right" size={20} color={accent[700]} />
                    </HStack>
                  </Pressable>
                )}
              </HStack>

              {loading ? (
                <VStack space={3}>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} h="16" borderRadius={14} startColor="muted.200" />
                  ))}
                </VStack>
              ) : recentTransactions.length === 0 ? (
                <VStack alignItems="center" space={2} py={4}>
                  <Text fontSize={18} fontFamily="SourceSansPro" color="muted.400">
                    No transactions yet
                  </Text>
                </VStack>
              ) : (
                <GroupedTransactionList
                  transactions={recentTransactions}
                  categories={categories}
                  symbol={user.symbol}
                  onPressTransaction={() => navigation.navigate("History")}
                />
              )}
            </VStack>
            <VStack>
              <VStack space={4}>
                <HStack justifyContent="space-between">
                  <Text fontFamily="SourceBold" fontSize={25}>
                    Monthly Budget
                  </Text>
                  {parentBudgets.length > 0 ? (
                    <EZButton
                      _text={{
                        fontFamily: "SourceBold",
                        color: accent[700],
                        fontSize: 17,
                      }}
                      variant="unstyled"
                      _pressed={{ opacity: 0.4 }}
                      onPress={openEditBudgetsModal}
                      leftIcon={
                        <MaterialCommunityIcons
                          name="lead-pencil"
                          size={22}
                          color={accent[700]}
                        />
                      }>
                      Edit
                    </EZButton>
                  ) : (
                    <EZButton
                      _text={{
                        fontFamily: "SourceBold",
                        color: accent[700],
                        fontSize: 17,
                      }}
                      variant="unstyled"
                      onPress={openEditBudgetsModal}
                      leftIcon={<Feather name="plus" size={22} color={accent[700]} />}>
                      Add
                    </EZButton>
                  )}
                </HStack>

                {monthlyBudgets.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    mx={-7}
                    style={{ paddingTop: 5, paddingBottom: 10 }}
                    contentContainerStyle={{ paddingHorizontal: 28 }}>
                    <HStack space="20px">
                      {(parentBudgets as any[]).map((item: any) => (
                        <MonthlyBudgetCategory
                          key={item.id}
                          budget={item}
                          monthlyTotal={getCategoryMonthlyTotal(item.category!)}
                        />
                      ))}
                    </HStack>
                  </ScrollView>
                ) : (
                  <VStack alignItems="center" space={2}>
                    <SetBudget width={180} height={120} />
                    <Text fontSize={20} fontFamily="SourceSansPro">
                      No budgets set yet
                    </Text>
                  </VStack>
                )}
              </VStack>
            </VStack>
          </VStack>
        </View>
      </ScrollView>

      <MonthYearPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        month={user.month}
        year={selectedYear}
        onSelect={(month, year) => applyPeriod(month, year)}
      />

      <WalletPickerSheet
        isOpen={walletSheetOpen}
        onClose={() => setWalletSheetOpen(false)}
        wallets={wallets}
        groups={walletGroups}
        activeWalletId={user.activeWalletId}
        balances={walletBalances}
        totalBalance={totalWalletBalance}
        symbol={user.symbol}
        onSelect={(walletId) => {
          dispatch(setActiveWalletAction(walletId));
          applyPeriod(user.month, selectedYear, walletId);
        }}
        onManage={() => navigation.navigate("ManageWallets")}
        onOverview={() => navigation.navigate("WalletsOverview")}
        onTransfer={() => setTransferOpen(true)}
      />

      <TransferModal
        isOpen={transferOpen}
        onClose={() => setTransferOpen(false)}
        wallets={wallets}
        defaultFromId={user.activeWalletId}
        symbol={user.symbol}
        onSubmit={async ({ fromWalletId, toWalletId, amount, description }) => {
          await WalletService.createTransfer({
            userId: Number(user.id),
            fromWalletId,
            toWalletId,
            amount,
            description,
          });
          await loadWalletBalances();
        }}
      />
    </View>
  );
};
export default HomeScreen;
