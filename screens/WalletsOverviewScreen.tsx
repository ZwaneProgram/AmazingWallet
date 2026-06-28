import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Box,
  VStack,
  HStack,
  Divider,
  Spinner,
  Badge,
} from "native-base";
import { SafeAreaView, TouchableOpacity, ScrollView } from "react-native";
import { AntDesign, Feather } from "@expo/vector-icons";
import { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { StatusBar } from "expo-status-bar";
import moment from "moment";
import { getPeriodRange } from "../utils/period";
import { RootState } from "../redux/store";
import COLORS from "../colors";
import { WalletService } from "../api/services/WalletService";
import { WalletGroupService } from "../api/services/WalletGroupService";
import { WalletSummary, WalletGroup } from "../interfaces/Wallet";
import { renderCategoryIcon } from "../utils/categoryIcons";
import { useAccent } from "../hooks/useAccent";

interface WalletsOverviewScreenProps {
  navigation: NavigationProp<ParamListBase>;
}

const WalletsOverviewScreen: React.FC<WalletsOverviewScreenProps> = ({ navigation }) => {
  const user: any = useSelector((state: RootState) => state.user);
  const accent = useAccent();
  const [summaries, setSummaries] = useState<WalletSummary[]>([]);
  const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set());
  const [groups, setGroups] = useState<WalletGroup[]>([]);
  // walletId -> groupId (or null when ungrouped)
  const [groupOf, setGroupOf] = useState<Record<number, number | null>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const selectedYear = user.year || moment().year();
      const { start: startOfMonth, end: endOfMonth } = getPeriodRange(
        user.month,
        selectedYear,
        user.cycleStartDay || 1
      );

      try {
        const [data, ws, gs] = await Promise.all([
          WalletService.getWalletSummaries(user.id, startOfMonth, endOfMonth),
          WalletService.getUserWallets(user.id),
          WalletGroupService.getUserGroups(user.id),
        ]);
        setSummaries(data);
        setGroups(gs);
        setExcludedIds(new Set(ws.filter((w) => w.excludeFromTotal && w.id != null).map((w) => w.id!)));
        const map: Record<number, number | null> = {};
        ws.forEach((w) => {
          if (w.id != null) map[w.id] = w.groupId ?? null;
        });
        setGroupOf(map);
      } catch (err) {
        console.log("WalletsOverviewScreen load error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user.id, user.month, user.year]);

  const totalBalance = summaries.reduce(
    (acc, s) => (excludedIds.has(s.walletId) ? acc : acc + s.balance),
    0
  );

  const renderWalletCard = (s: WalletSummary) => (
    <Box key={s.walletId} bg="muted.50" borderRadius={16} shadow={2} px={5} py={4} mb={3}>
      <HStack alignItems="center" space={3} mb={3}>
        <Box
          width="44px"
          height="44px"
          borderRadius={14}
          justifyContent="center"
          alignItems="center"
          style={{ backgroundColor: s.color || accent[700] }}>
          {renderCategoryIcon(s.icon ?? "cash", s.name, 24, "#fff")}
        </Box>
        <Text fontFamily="SourceBold" fontSize={18} flex={1} numberOfLines={1}>
          {s.name}
        </Text>
        {excludedIds.has(s.walletId) && (
          <Badge
            colorScheme="muted"
            variant="subtle"
            borderRadius={6}
            px={2}
            py={0}
            _text={{ fontSize: 11, fontFamily: "SourceBold" }}>
            Not in total
          </Badge>
        )}
      </HStack>

      <Divider bg="muted.200" mb={3} />

      <VStack space={2}>
        <HStack justifyContent="space-between" alignItems="center">
          <HStack space={1} alignItems="center">
            <Feather name="arrow-down-left" size={14} color={COLORS.EMERALD[500]} />
            <Text fontFamily="SourceSansPro" color="muted.400" fontSize={14}>
              Income
            </Text>
          </HStack>
          <Text fontFamily="SourceBold" color="emerald.500" fontSize={16}>
            {user.symbol} {s.incomeTotal.toFixed(2)}
          </Text>
        </HStack>

        <HStack justifyContent="space-between" alignItems="center">
          <HStack space={1} alignItems="center">
            <Feather name="arrow-up-right" size={14} color={COLORS.DANGER[500]} />
            <Text fontFamily="SourceSansPro" color="muted.400" fontSize={14}>
              Expenses
            </Text>
          </HStack>
          <Text fontFamily="SourceBold" color="danger.500" fontSize={16}>
            {user.symbol} {s.expenseTotal.toFixed(2)}
          </Text>
        </HStack>

        <Divider bg="muted.200" />

        <HStack justifyContent="space-between" alignItems="center">
          <Text fontFamily="SourceBold" fontSize={15}>
            Balance
          </Text>
          <Text
            fontFamily="SourceBold"
            fontSize={18}
            color={s.balance >= 0 ? "emerald.500" : "danger.500"}>
            {user.symbol} {s.balance.toFixed(2)}
          </Text>
        </HStack>
      </VStack>
    </Box>
  );

  // Group subtotal excludes wallets flagged "not in total" (mirrors Net Balance).
  const subtotalOf = (members: WalletSummary[]) =>
    members.reduce((acc, s) => (excludedIds.has(s.walletId) ? acc : acc + s.balance), 0);

  const ungroupedSummaries = summaries.filter((s) => !groupOf[s.walletId]);

  const GroupSectionHeader: React.FC<{ group: WalletGroup; subtotal: number }> = ({
    group,
    subtotal,
  }) => (
    <HStack alignItems="center" space={2} mb={2} mt={1}>
      <Box
        width="28px"
        height="28px"
        borderRadius={10}
        justifyContent="center"
        alignItems="center"
        style={{ backgroundColor: group.color || accent[700] }}>
        {renderCategoryIcon(group.icon ?? "cash", group.name, 16, "#fff")}
      </Box>
      <Text fontFamily="SourceBold" fontSize={16} flex={1} numberOfLines={1}>
        {group.name}
      </Text>
      <Text
        fontFamily="SourceBold"
        fontSize={16}
        color={subtotal >= 0 ? "emerald.500" : "danger.500"}>
        {user.symbol} {subtotal.toFixed(2)}
      </Text>
    </HStack>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar style={user.theme === "dark" ? "light" : "dark"} />
      <View flex={1} pt={12} px={6}>
        <HStack alignItems="center" justifyContent="space-between" mb={4}>
          <Text fontFamily="SourceBold" fontSize={26}>
            All Wallets
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <AntDesign name="close" size={24} color={user.theme === "dark" ? "#fff" : "#111827"} />
          </TouchableOpacity>
        </HStack>

        {loading ? (
          <View flex={1} justifyContent="center" alignItems="center">
            <Spinner color="purple.700" size="lg" />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}>
            <Box bg="muted.50" borderRadius={16} shadow={2} px={5} py={4} mb={4}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontFamily="SourceBold" fontSize={18}>
                  Net Balance
                </Text>
                <Text
                  fontFamily="SourceBold"
                  fontSize={24}
                  color={totalBalance >= 0 ? "emerald.500" : "danger.500"}>
                  {user.symbol} {totalBalance.toFixed(2)}
                </Text>
              </HStack>
            </Box>

            {groups.map((g) => {
              const members = summaries.filter((s) => groupOf[s.walletId] === g.id);
              if (members.length === 0) return null;
              return (
                <VStack key={`g-${g.id}`} mb={2}>
                  <GroupSectionHeader group={g} subtotal={subtotalOf(members)} />
                  {members.map(renderWalletCard)}
                </VStack>
              );
            })}

            {ungroupedSummaries.length > 0 && (
              <VStack>
                {groups.length > 0 && (
                  <Text
                    fontFamily="SourceBold"
                    fontSize={13}
                    color="muted.400"
                    mb={2}
                    mt={1}
                    style={{ textTransform: "uppercase", letterSpacing: 1 }}>
                    Ungrouped
                  </Text>
                )}
                {ungroupedSummaries.map(renderWalletCard)}
              </VStack>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

export default WalletsOverviewScreen;
