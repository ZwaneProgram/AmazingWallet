import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  HStack,
  VStack,
  Box,
  Pressable,
  ScrollView,
  Modal,
  Badge,
} from "native-base";
import { SafeAreaView, TouchableOpacity, Alert, Platform } from "react-native";
import { AntDesign, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { StatusBar } from "expo-status-bar";
import { RootState } from "../redux/store";
import COLORS from "../colors";
import { MonthlyCost, MonthlyCostType } from "../interfaces/MonthlyCost";
import { Category } from "../interfaces/Category";
import { Wallet } from "../interfaces/Wallet";
import { MonthlyCostService } from "../api/services/MonthlyCostService";
import {
  categoriesSelector,
  walletsSelector,
  monthlyCostsSelector,
  setMonthlyCostsAction,
} from "../redux/expensesReducers";
import { costStatus, dueDateLabel, payMonthlyCost } from "../utils/monthlyCosts";
import { renderCategoryIcon } from "../utils/categoryIcons";
import EZInput from "../components/shared/EZInput";
import EZButton from "../components/shared/EZButton";
import { authInput } from "../commonStyles";
import { useAccent } from "../hooks/useAccent";

interface Props {
  navigation: NavigationProp<ParamListBase>;
}

type Mode = "add" | "edit";

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const MonthlyCostsScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch();
  const user: any = useSelector((state: RootState) => state.user);
  const accent = useAccent();
  const isDark = user.theme === "dark";

  const wallets = useSelector(walletsSelector) as Wallet[];
  const categories = useSelector(categoriesSelector) as Category[];
  const costs = useSelector(monthlyCostsSelector) as MonthlyCost[];

  const [busyId, setBusyId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [mode, setMode] = useState<Mode>("add");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState<string>("");
  const [type, setType] = useState<MonthlyCostType>("expense");
  const [amount, setAmount] = useState<string>("");
  const [walletId, setWalletId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [saving, setSaving] = useState<boolean>(false);

  const parentCategories = (categories ?? []).filter(
    (c) => !c.parentId && (c.type ?? "expense") === type
  );

  const notify = (title: string, message?: string) => {
    if (Platform.OS === "web") window.alert(message ? `${title}\n\n${message}` : title);
    else Alert.alert(title, message);
  };

  const refresh = async () => {
    const data = await MonthlyCostService.getUserMonthlyCosts(user.id);
    dispatch(setMonthlyCostsAction(data));
  };

  useEffect(() => {
    // Pull fresh in case something changed elsewhere.
    refresh();
  }, []);

  const openAdd = () => {
    setMode("add");
    setEditingId(null);
    setName("");
    setType("expense");
    setAmount("");
    const def = wallets.find((w) => w.isDefault) ?? wallets[0];
    setWalletId(def?.id ?? null);
    setCategoryId(null);
    setDayOfMonth(1);
    setModalOpen(true);
  };

  const openEdit = (cost: MonthlyCost) => {
    setMode("edit");
    setEditingId(cost.id ?? null);
    setName(cost.name);
    setType(cost.type);
    setAmount(String(cost.amount).replace(".", ","));
    setWalletId(cost.walletId ?? null);
    setCategoryId(cost.categoryId ?? null);
    setDayOfMonth(cost.dayOfMonth);
    setModalOpen(true);
  };

  const save = async () => {
    const numeric = Number(amount.replace(",", "."));
    if (!name.trim()) return notify("Name required", "Please enter a name.");
    if (!numeric || numeric <= 0) return notify("Invalid amount", "Enter an amount greater than 0.");
    if (!walletId) return notify("Wallet required", "Please pick a wallet.");
    setSaving(true);
    try {
      if (mode === "edit" && editingId) {
        await MonthlyCostService.updateMonthlyCost(editingId, {
          walletId,
          type,
          categoryId,
          amount: numeric,
          name: name.trim(),
          dayOfMonth,
        });
      } else {
        await MonthlyCostService.createMonthlyCost({
          userId: user.id,
          walletId,
          type,
          categoryId,
          amount: numeric,
          name: name.trim(),
          dayOfMonth,
        });
      }
      await refresh();
      setModalOpen(false);
    } catch (error) {
      console.log("save monthly cost failed:", error);
      notify("Error", "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cost: MonthlyCost) => {
    const doDelete = async () => {
      try {
        await MonthlyCostService.deleteMonthlyCost(cost.id!);
        await refresh();
      } catch (e) {
        console.log("delete monthly cost failed:", e);
        notify("Error", "Could not delete. Please try again.");
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${cost.name}"?`)) doDelete();
    } else {
      Alert.alert("Delete", `Delete "${cost.name}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const handlePay = async (cost: MonthlyCost) => {
    setBusyId(cost.id ?? null);
    try {
      await payMonthlyCost(cost, categories, dispatch, user.activeWalletId);
      await refresh();
    } catch (e) {
      console.log("pay monthly cost failed:", e);
      notify("Error", "Could not record the payment. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const togglePause = async (cost: MonthlyCost) => {
    try {
      await MonthlyCostService.setActive(cost.id!, !(cost.active ?? true));
      await refresh();
    } catch (e) {
      console.log("toggle pause failed:", e);
    }
  };

  const walletName = (id?: number | null) => wallets.find((w) => w.id === id)?.name ?? "—";

  const monthlyTotal = (costs ?? [])
    .filter((c) => c.active !== false)
    .reduce((sum, c) => sum + (c.type === "income" ? c.amount : -c.amount), 0);

  const Row: React.FC<{ cost: MonthlyCost }> = ({ cost }) => {
    const status = costStatus(cost);
    const isIncome = cost.type === "income";
    const tint = isIncome ? COLORS.EMERALD[500] : COLORS.DANGER[500];
    const paused = cost.active === false;
    const cat = parentCategories.find((c) => c.id === cost.categoryId);
    return (
      <Box bg="muted.50" borderRadius={22} shadow={1} px={4} py={4} mb={3} opacity={paused ? 0.55 : 1}>
        <HStack alignItems="center" space={3}>
          <Box
            width="40px"
            height="40px"
            borderRadius={13}
            justifyContent="center"
            alignItems="center"
            style={{ backgroundColor: cat?.color || tint }}>
            {renderCategoryIcon(cat?.icon ?? (isIncome ? "cash" : "card"), cost.name, 20, "#fff")}
          </Box>
          <VStack flex={1}>
            <Text fontFamily="SourceBold" fontSize={16} numberOfLines={1}>
              {cost.name}
            </Text>
            <Text fontFamily="SourceSansPro" fontSize={12} color="muted.400" numberOfLines={1}>
              Every {ordinal(cost.dayOfMonth)} · {walletName(cost.walletId)}
            </Text>
          </VStack>
          <Text fontFamily="SourceBold" fontSize={16} style={{ color: tint }}>
            {isIncome ? "+" : "-"} {user.symbol} {cost.amount.toFixed(2)}
          </Text>
        </HStack>

        <HStack alignItems="center" justifyContent="space-between" mt={3}>
          {paused ? (
            <Badge colorScheme="muted" variant="subtle" borderRadius={6} _text={{ fontSize: 11, fontFamily: "SourceBold" }}>
              Paused
            </Badge>
          ) : status === "paid" ? (
            <HStack alignItems="center" space={1}>
              <Feather name="check-circle" size={14} color={COLORS.EMERALD[500]} />
              <Text fontFamily="SourceBold" fontSize={12} color="emerald.500">
                Paid · next {dueDateLabel(cost)}
              </Text>
            </HStack>
          ) : status === "due" ? (
            <Badge colorScheme="orange" variant="subtle" borderRadius={6} _text={{ fontSize: 11, fontFamily: "SourceBold" }}>
              Due now
            </Badge>
          ) : (
            <Text fontFamily="SourceSansPro" fontSize={12} color="muted.400">
              Upcoming · {dueDateLabel(cost)}
            </Text>
          )}

          <HStack alignItems="center" space={1}>
            {!paused && status !== "paid" && (
              <Pressable
                onPress={() => handlePay(cost)}
                disabled={busyId === cost.id}
                px={3}
                py={1.5}
                borderRadius={9}
                bg={tint}
                _pressed={{ opacity: 0.7 }}>
                <Text fontFamily="SourceBold" fontSize={13} color="white">
                  {busyId === cost.id
                    ? "…"
                    : isIncome
                    ? status === "due"
                      ? "Receive now"
                      : "Receive early"
                    : status === "due"
                    ? "Pay now"
                    : "Pay early"}
                </Text>
              </Pressable>
            )}
            <TouchableOpacity onPress={() => togglePause(cost)} style={{ padding: 6 }}>
              <Feather name={paused ? "play" : "pause"} size={16} color={COLORS.MUTED[500]} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openEdit(cost)} style={{ padding: 6 }}>
              <Feather name="edit-2" size={16} color={COLORS.MUTED[500]} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(cost)} style={{ padding: 6 }}>
              <Feather name="trash-2" size={16} color={COLORS.DANGER[500]} />
            </TouchableOpacity>
          </HStack>
        </HStack>
      </Box>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View flex={1} pt={12} px={6}>
        <HStack alignItems="center" justifyContent="space-between" mb={1}>
          <Text fontFamily="SourceBold" fontSize={26}>
            Monthly costs
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <AntDesign name="close" size={24} color={isDark ? "#fff" : "#111827"} />
          </TouchableOpacity>
        </HStack>
        <Text fontFamily="SourceSansPro" fontSize={13} color="muted.400" mb={4}>
          Bills & income that repeat each month. You confirm each one when it's due.
        </Text>

        <Pressable onPress={openAdd} _pressed={{ opacity: 0.7 }} mb={4}>
          <HStack bg="purple.700" borderRadius={12} height="48px" alignItems="center" justifyContent="center" space={2}>
            <Feather name="plus" size={20} color="#fff" />
            <Text fontFamily="SourceBold" fontSize={16} color="white">
              Add monthly cost
            </Text>
          </HStack>
        </Pressable>

        {(costs ?? []).length === 0 ? (
          <View flex={1} justifyContent="center" alignItems="center" px={6}>
            <MaterialCommunityIcons name="calendar-refresh" size={56} color={COLORS.MUTED[300]} />
            <Text fontSize={17} fontFamily="SourceSansPro" color="muted.400" mt={2} textAlign="center">
              No monthly costs yet. Add rent, subscriptions, salary…
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Net monthly recurring total */}
            <Box bg="muted.50" borderRadius={14} px={5} py={3} mb={4}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontFamily="SourceSansPro" fontSize={14} color="muted.500">
                  Net per month
                </Text>
                <Text
                  fontFamily="SourceBold"
                  fontSize={18}
                  color={monthlyTotal >= 0 ? "emerald.500" : "danger.500"}>
                  {monthlyTotal >= 0 ? "+" : "-"} {user.symbol} {Math.abs(monthlyTotal).toFixed(2)}
                </Text>
              </HStack>
            </Box>
            {(costs ?? []).map((cost) => (
              <Row key={cost.id} cost={cost} />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Add / edit modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} avoidKeyboard>
        <Modal.Content maxWidth="440px" width="94%" bg={isDark ? "#1f2937" : "white"}>
          <Modal.CloseButton _icon={{ color: isDark ? "#ffffff" : "#262626" }} />
          <Modal.Body>
            <ScrollView showsVerticalScrollIndicator={false}>
              <VStack space={4}>
                <Text fontFamily="SourceBold" fontSize={20}>
                  {mode === "edit" ? "Edit monthly cost" : "New monthly cost"}
                </Text>

                {/* Expense / Income — muted.50 track is theme-aware (dark surface in
                    dark mode), matching the Add screen's toggle. */}
                <HStack bg="muted.50" borderRadius={12} p={1}>
                  {(["expense", "income"] as MonthlyCostType[]).map((t) => {
                    const active = type === t;
                    return (
                      <Pressable
                        key={t}
                        flex={1}
                        onPress={() => {
                          setType(t);
                          setCategoryId(null);
                        }}>
                        <View
                          py={2}
                          borderRadius={10}
                          alignItems="center"
                          bg={active ? (t === "income" ? "emerald.500" : "danger.500") : "transparent"}>
                          <Text
                            fontFamily="SourceBold"
                            fontSize={15}
                            color={active ? "white" : "muted.500"}>
                            {t === "income" ? "Income" : "Expense"}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </HStack>

                <EZInput
                  style={authInput}
                  type="text"
                  label="Name"
                  placeholder="e.g. Rent, Netflix, Salary"
                  value={name}
                  onChangeText={setName}
                  borderRadius={12}
                  borderColor="muted.200"
                />

                <EZInput
                  style={authInput}
                  type="text"
                  keyboardType="decimal-pad"
                  label={`Amount ${user.symbol ?? ""}`}
                  placeholder="0"
                  value={amount}
                  onChangeText={setAmount}
                  borderRadius={12}
                  borderColor="muted.200"
                />

                {/* Wallet */}
                <VStack space={2}>
                  <Text fontFamily="SourceBold" fontSize={16}>
                    Wallet
                  </Text>
                  <Box flexDirection="row" flexWrap="wrap" style={{ marginHorizontal: -4 }}>
                    {wallets.map((w) => {
                      const active = walletId === w.id;
                      return (
                        <Pressable key={w.id} onPress={() => setWalletId(w.id ?? null)} style={{ margin: 4 }}>
                          <Box
                            px={3}
                            py={2}
                            borderRadius={12}
                            borderWidth={1.5}
                            borderColor={active ? accent[700] : "muted.200"}
                            bg={active ? "purple.100" : "transparent"}>
                            <Text fontFamily="SourceBold" fontSize={14} color={active ? "purple.700" : "muted.500"}>
                              {w.name}
                            </Text>
                          </Box>
                        </Pressable>
                      );
                    })}
                  </Box>
                </VStack>

                {/* Category (optional) */}
                <VStack space={2}>
                  <Text fontFamily="SourceBold" fontSize={16}>
                    Category (optional)
                  </Text>
                  <Box flexDirection="row" flexWrap="wrap" style={{ marginHorizontal: -4 }}>
                    {[{ id: null, name: "None" } as any, ...parentCategories].map((c) => {
                      const active = categoryId === (c.id ?? null);
                      return (
                        <Pressable key={String(c.id ?? "none")} onPress={() => setCategoryId(c.id ?? null)} style={{ margin: 4 }}>
                          <Box
                            px={3}
                            py={2}
                            borderRadius={12}
                            borderWidth={1.5}
                            borderColor={active ? accent[700] : "muted.200"}
                            bg={active ? "purple.100" : "transparent"}>
                            <Text fontFamily="SourceBold" fontSize={14} color={active ? "purple.700" : "muted.500"}>
                              {c.name}
                            </Text>
                          </Box>
                        </Pressable>
                      );
                    })}
                  </Box>
                </VStack>

                {/* Day of month */}
                <VStack space={2}>
                  <Text fontFamily="SourceBold" fontSize={16}>
                    Due day — every {ordinal(dayOfMonth)}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <HStack space={2}>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => {
                        const active = dayOfMonth === d;
                        return (
                          <Pressable key={d} onPress={() => setDayOfMonth(d)}>
                            <Box
                              width="40px"
                              height="40px"
                              borderRadius={12}
                              justifyContent="center"
                              alignItems="center"
                              borderWidth={1.5}
                              borderColor={active ? accent[700] : "muted.200"}
                              bg={active ? "purple.700" : "transparent"}>
                              <Text fontFamily="SourceBold" fontSize={15} color={active ? "white" : "muted.500"}>
                                {d}
                              </Text>
                            </Box>
                          </Pressable>
                        );
                      })}
                    </HStack>
                  </ScrollView>
                </VStack>

                <EZButton
                  variant="solid"
                  isLoading={saving}
                  onPress={save}
                  bg="purple.700"
                  borderRadius={8}
                  height="46px"
                  _text={{ fontFamily: "SourceSansPro", fontSize: 16 }}>
                  {mode === "edit" ? "Save changes" : "Create"}
                </EZButton>
              </VStack>
            </ScrollView>
          </Modal.Body>
        </Modal.Content>
      </Modal>
    </SafeAreaView>
  );
};

export default MonthlyCostsScreen;
