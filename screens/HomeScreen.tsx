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
  balanceSelector,
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
  todayTotalSelector,
  walletsSelector,
} from "../redux/expensesReducers";
import { LinearGradient } from "expo-linear-gradient";
import moment from "moment";
import { setActiveWalletAction, setMonthAction, setYearAction } from "../redux/userReducer";
import MonthYearPickerModal from "../components/MonthYearPickerModal";
import WalletPickerSheet from "../components/WalletPickerSheet";
import GroupedTransactionList from "../components/GroupedTransactionList";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WalletService } from "../api/services/WalletService";

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
  const { expenses } = useSelector((state: RootState) => state.expenses);
  const incomes = useSelector((state: RootState) => state.expenses.incomes);
  const categories = useSelector(categoriesSelector);
  const todayTotal = useSelector(todayTotalSelector);
  const monthTotal = useSelector(monthTotalSelector);
  const monthIncomeTotal = useSelector(monthIncomeTotalSelector);
  const balance = useSelector(balanceSelector);
  const monthlyBudgets = useSelector(monthlyBudgetsSelector);
  const rollup = useSelector(categoryRollupSelector);
  const wallets = useSelector(walletsSelector);

  const user: any = useSelector((state: RootState) => state.user);

  const recentTransactions = useMemo(() => {
    const merged: any[] = [
      ...expenses.map((e: any) => ({ ...e, kind: "expense" })),
      ...incomes.map((i: any) => ({ ...i, kind: "income" })),
    ].sort((a, b) =>
      a.payDate < b.payDate ? 1 : a.payDate > b.payDate ? -1 : (b.id ?? 0) - (a.id ?? 0)
    );
    return merged.slice(0, 10);
  }, [expenses, incomes]);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <View style={{ height: 138 + insets.top }}>
          <LinearGradient
            colors={
              user.theme === "light"
                ? [COLORS.PURPLE[900], COLORS.PURPLE[600]]
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
                    TODAY
                  </Text>
                  <Text fontFamily="SourceBold" color="white" fontSize={28}>
                    {user.symbol} {todayTotal.toFixed(2)}
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
                      {user.month} {selectedYear}
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
  }, [navigation, todayTotal, loading, user.month, user.year, user.activeWalletId, wallets, insets.top, user.theme]);

  useEffect(() => {
    if (!expenses.length) {
      getGeneralInfo();
    }
  }, [user]);

  const getAllCategories = async () => {
    return await CategoryService.getUserCategories(user.id);
  };

  const getMonthlyBudgets = async (userId: number, walletId: number) => {
    const budgets = await UserService.getUserBudgets(userId, walletId);

    return budgets;
  };

  const selectedYear = user.year || moment().year();
  const parsedMonth = moment(user.month, "MMMM");
  const monthNumber = parsedMonth.month();
  const startOfMonth = moment()
    .year(selectedYear)
    .month(monthNumber)
    .startOf("month")
    .format("YYYY-MM-DD");
  const endOfMonth = moment()
    .year(selectedYear)
    .month(monthNumber)
    .endOf("month")
    .format("YYYY-MM-DD");

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

    const allWallets = await WalletService.getUserWallets(user.id);
    dispatch(setWalletsAction(allWallets));
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

  const applyPeriod = async (month: string, year: number, walletId: number = user.activeWalletId) => {
    const parsedMonth = moment(month, "MMMM");
    if (!parsedMonth.isValid()) {
      return;
    }

    dispatch(setMonthAction(parsedMonth.format("MMMM")));
    dispatch(setYearAction(year));

    const monthNumber = parsedMonth.month();
    const startOfMonth = moment()
      .year(year)
      .month(monthNumber)
      .startOf("month")
      .format("YYYY-MM-DD");
    const endOfMonth = moment()
      .year(year)
      .month(monthNumber)
      .endOf("month")
      .format("YYYY-MM-DD");

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

  return (
    <View flex={1}>
      <StatusBar style="light" />
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <View flex={1} pt={10} px={7}>
          <VStack space={8}>
            {overallBudget > 0 && (
              <Box bg="muted.50" borderRadius={16} shadow={2} px={5} py={4}>
                <HStack justifyContent="space-between" alignItems="center" mb={2}>
                  <Text fontFamily="SourceBold" fontSize={18}>
                    Overall budget
                  </Text>
                  <Text
                    fontFamily="SourceBold"
                    fontSize={15}
                    color={overBudget ? "danger.500" : "muted.500"}>
                    {user.symbol} {monthTotal.toFixed(2)} / {user.symbol}{" "}
                    {Number(overallBudget).toFixed(2)}
                  </Text>
                </HStack>
                <Box bg="muted.200" height="12px" borderRadius={20} overflow="hidden">
                  <Box
                    height="12px"
                    borderRadius={20}
                    width={`${overallPct}%`}
                    style={{
                      backgroundColor: overBudget ? COLORS.DANGER[500] : COLORS.EMERALD[500],
                    }}
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
                <Text fontFamily="SourceBold" fontSize={18}>
                  Balance
                </Text>
                <Text
                  fontFamily="SourceBold"
                  fontSize={24}
                  color={balance >= 0 ? "emerald.500" : "danger.500"}>
                  {user.symbol} {balance.toFixed(2)}
                </Text>
              </HStack>
            </Box>
            <VStack space={3}>
              <Text fontFamily="SourceBold" fontSize={25}>
                Monthly costs
              </Text>

              <Box
                alignSelf="center"
                bg="muted.50"
                width="100%"
                shadow={2}
                borderRadius={10}
                px={5}
                py={3}>
                <Text fontFamily="SourceSansPro" color="muted.400" fontSize={20}>
                  {user.month}
                </Text>
                {loading ? (
                  <Skeleton mt={5} mb={3} h="5" width={20} rounded="full" startColor="indigo.300" />
                ) : (
                  <Text fontFamily="SourceBold" fontSize={35}>
                    {user.symbol} {monthTotal.toFixed(2)}
                  </Text>
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
              </Box>
            </VStack>
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
                        color={COLORS.PURPLE[700]}
                        fontSize={17}
                        numberOfLines={1}>
                        View all
                      </Text>
                      <Feather name="chevron-right" size={20} color={COLORS.PURPLE[700]} />
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
                        color: COLORS.PURPLE[700],
                        fontSize: 17,
                      }}
                      variant="unstyled"
                      _pressed={{ opacity: 0.4 }}
                      onPress={openEditBudgetsModal}
                      leftIcon={
                        <MaterialCommunityIcons
                          name="lead-pencil"
                          size={22}
                          color={COLORS.PURPLE[700]}
                        />
                      }>
                      Edit
                    </EZButton>
                  ) : (
                    <EZButton
                      _text={{
                        fontFamily: "SourceBold",
                        color: COLORS.PURPLE[700],
                        fontSize: 17,
                      }}
                      variant="unstyled"
                      onPress={openEditBudgetsModal}
                      leftIcon={<Feather name="plus" size={22} color={COLORS.PURPLE[700]} />}>
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
        activeWalletId={user.activeWalletId}
        onSelect={(walletId) => {
          dispatch(setActiveWalletAction(walletId));
          applyPeriod(user.month, selectedYear, walletId);
        }}
        onManage={() => navigation.navigate("ManageWallets")}
        onOverview={() => navigation.navigate("WalletsOverview")}
      />
    </View>
  );
};
export default HomeScreen;
