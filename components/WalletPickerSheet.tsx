import React, { useEffect, useState } from "react";
import { Actionsheet, Box, HStack, Text, VStack } from "native-base";
import { ScrollView, TouchableOpacity } from "react-native";
import { AntDesign, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { Wallet, WalletGroup } from "../interfaces/Wallet";
import { renderCategoryIcon } from "../utils/categoryIcons";
import { RootState } from "../redux/store";
import COLORS from "../colors";
import { useAccent } from "../hooks/useAccent";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  groups?: WalletGroup[];
  activeWalletId: number;
  onSelect: (walletId: number) => void;
  onManage: () => void;
  onOverview: () => void;
  onTransfer: () => void;
  // All-time balance per wallet id, plus the grand total across wallets.
  balances?: Record<number, number>;
  totalBalance?: number;
  symbol?: string;
}

// Fixed row height keeps the sheet predictable. We deliberately avoid
// native-base <Actionsheet.Item> for the wallet rows: on RN 0.81 the
// non-active items were collapsing their content while keeping a huge
// height, leaving a big empty gap. Plain TouchableOpacity rows are stable.
const ROW_HEIGHT = 56;

const WalletPickerSheet: React.FC<Props> = ({
  isOpen,
  onClose,
  wallets,
  groups,
  activeWalletId,
  onSelect,
  onManage,
  onOverview,
  onTransfer,
  balances,
  totalBalance,
  symbol,
}) => {
  const isDark = useSelector((state: RootState) => state.user.theme) === "dark";
  const accent = useAccent();
  const textColor = isDark ? "#ffffff" : "#262626";
  const iconColor = isDark ? COLORS.MUTED[300] : COLORS.MUTED[500];
  const sheetBg = isDark ? "#1f2937" : "#ffffff";
  const activeBg = isDark ? "#3b2e63" : accent[100];
  const activeTint = isDark ? accent[300] : accent[700];

  const fmtBalance = (v?: number) =>
    v == null ? "—" : `${symbol ?? ""} ${v.toFixed(2)}`;
  const balanceColor = (v?: number) =>
    v == null ? iconColor : v >= 0 ? COLORS.EMERALD[500] : COLORS.DANGER[500];

  // Collapsed state per group (true = collapsed). On open, every group starts
  // collapsed except the one holding the active wallet, so the check stays visible.
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  useEffect(() => {
    if (!isOpen) return;
    const activeGroupId = wallets.find((w) => w.id === activeWalletId)?.groupId ?? null;
    const next: Record<number, boolean> = {};
    (groups ?? []).forEach((g) => {
      if (g.id != null) next[g.id] = g.id !== activeGroupId;
    });
    setCollapsed(next);
  }, [isOpen]);
  const toggleGroup = (id: number) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  // Scroll only when there are enough wallets to overflow; otherwise the
  // list sizes to its content so the footer sits right beneath it.
  const needsScroll = wallets.length > 6;

  const anyExcluded = wallets.some((w) => (w as any).excludeFromTotal);

  const renderWalletRow = (w: Wallet) => {
    const isActive = w.id === activeWalletId;
    const excluded = (w as any).excludeFromTotal;
    return (
      <TouchableOpacity
        key={w.id}
        activeOpacity={0.6}
        onPress={() => {
          onSelect(w.id!);
          onClose();
        }}
        style={{
          height: ROW_HEIGHT,
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 12,
          borderRadius: 12,
          backgroundColor: isActive ? activeBg : "transparent",
        }}>
        <HStack space={3} alignItems="center" flex={1}>
          {renderCategoryIcon(w.icon ?? "cash", w.name, 22, w.color || accent[700])}
          <VStack flex={1}>
            <Text
              fontFamily="SourceSansPro"
              fontSize={17}
              color={isActive ? activeTint : textColor}
              numberOfLines={1}>
              {w.name}
            </Text>
            {excluded && (
              <HStack space={1} alignItems="center">
                <Feather name="eye-off" size={11} color={iconColor} />
                <Text fontFamily="SourceSansPro" fontSize={11} color={iconColor}>
                  Not in total
                </Text>
              </HStack>
            )}
          </VStack>
        </HStack>
        <HStack space={2} alignItems="center">
          <Text
            fontFamily="SourceBold"
            fontSize={15}
            style={{ color: excluded ? iconColor : balanceColor(balances?.[w.id!]) }}>
            {fmtBalance(balances?.[w.id!])}
          </Text>
          {isActive && <AntDesign name="check" size={16} color={activeTint} />}
        </HStack>
      </TouchableOpacity>
    );
  };

  const groupLabel = (key: string, label: string) => (
    <Text
      key={key}
      fontFamily="SourceBold"
      fontSize={12}
      color={iconColor}
      style={{ textTransform: "uppercase", letterSpacing: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 2 }}>
      {label}
    </Text>
  );

  // A group renders as one big collapsible "card" button: tap to expand/collapse
  // its wallets. The colored icon + left accent bar make groups visually distinct
  // from the plain "Ungrouped" label below.
  const renderGroupCard = (g: WalletGroup, members: Wallet[]) => {
    const isCollapsed = !!collapsed[g.id!];
    const subtotal = members.reduce(
      (acc, w) => ((w as any).excludeFromTotal ? acc : acc + (balances?.[w.id!] ?? 0)),
      0
    );
    const gColor = g.color || accent[700];
    return (
      <Box key={`g-${g.id}`} mb={1}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => toggleGroup(g.id!)}
          style={{
            borderRadius: 14,
            paddingVertical: 10,
            paddingHorizontal: 12,
            backgroundColor: isDark ? "#111827" : COLORS.MUTED[100],
            borderLeftWidth: 4,
            borderLeftColor: gColor,
            flexDirection: "row",
            alignItems: "center",
          }}>
          <Box
            width="36px"
            height="36px"
            borderRadius={12}
            justifyContent="center"
            alignItems="center"
            style={{ backgroundColor: gColor }}>
            {renderCategoryIcon(g.icon ?? "cash", g.name, 20, "#fff")}
          </Box>
          <VStack flex={1} ml={3}>
            <Text fontFamily="SourceBold" fontSize={16} color={textColor} numberOfLines={1}>
              {g.name}
            </Text>
            <Text fontFamily="SourceSansPro" fontSize={11} color={iconColor}>
              {members.length} {members.length === 1 ? "wallet" : "wallets"}
            </Text>
          </VStack>
          <Text
            fontFamily="SourceBold"
            fontSize={14}
            style={{ color: balanceColor(subtotal), marginRight: 8 }}>
            {fmtBalance(subtotal)}
          </Text>
          <AntDesign name={isCollapsed ? "right" : "down"} size={14} color={iconColor} />
        </TouchableOpacity>
        {!isCollapsed && (
          <Box pl={2} mt={1}>
            {members.map((w) => renderWalletRow(w))}
          </Box>
        )}
      </Box>
    );
  };

  // Groups (collapsible cards) first; ungrouped wallets last under a plain label.
  // With no groups at all the list stays flat exactly like before.
  const ungrouped = wallets.filter((w) => !w.groupId);
  const groupedSections: React.ReactNode[] = [];
  const sortedGroups = (groups ?? []).slice();
  if (sortedGroups.length > 0) {
    let shownAnyGroup = false;
    sortedGroups.forEach((g) => {
      const members = wallets.filter((w) => w.groupId === g.id);
      if (members.length === 0) return; // skip empty groups in the picker
      shownAnyGroup = true;
      groupedSections.push(renderGroupCard(g, members));
    });
    if (ungrouped.length > 0) {
      if (shownAnyGroup) groupedSections.push(groupLabel("ungrouped", "Ungrouped"));
      ungrouped.forEach((w) => groupedSections.push(renderWalletRow(w)));
    }
  } else {
    wallets.forEach((w) => groupedSections.push(renderWalletRow(w)));
  }
  const walletRows = groupedSections;

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <Actionsheet.Content
        bg={sheetBg}
        style={{ backgroundColor: sheetBg, paddingBottom: 8 }}>
        {/* Grand total across all wallets */}
        <Box
          w="100%"
          mb={2}
          px={4}
          py={3}
          borderRadius={14}
          style={{ backgroundColor: isDark ? "#111827" : COLORS.MUTED[100] }}>
          <HStack alignItems="center" justifyContent="space-between">
            <VStack>
              <Text fontFamily="SourceSansPro" fontSize={13} color={iconColor}>
                Total balance
              </Text>
              <Text fontFamily="SourceSansPro" fontSize={11} color={iconColor}>
                {anyExcluded ? "some wallets excluded" : "across all wallets"}
              </Text>
            </VStack>
            <Text
              fontFamily="SourceBold"
              fontSize={22}
              style={{ color: balanceColor(totalBalance) }}>
              {fmtBalance(totalBalance)}
            </Text>
          </HStack>
        </Box>

        {needsScroll ? (
          <ScrollView style={{ width: "100%", maxHeight: ROW_HEIGHT * 6 }}>
            {walletRows}
          </ScrollView>
        ) : (
          <Box w="100%">{walletRows}</Box>
        )}

        <Box w="100%" my={1} h="1px" bg={isDark ? "#374151" : COLORS.MUTED[200]} />

        <TouchableOpacity
          activeOpacity={0.6}
          onPress={() => {
            onTransfer();
            onClose();
          }}
          style={{
            height: ROW_HEIGHT,
            width: "100%",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
          }}>
          <HStack space={3} alignItems="center">
            <Feather name="repeat" size={20} color={iconColor} />
            <Text fontFamily="SourceSansPro" fontSize={17} color={textColor}>
              Transfer money
            </Text>
          </HStack>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.6}
          onPress={() => {
            onOverview();
            onClose();
          }}
          style={{
            height: ROW_HEIGHT,
            width: "100%",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
          }}>
          <HStack space={3} alignItems="center">
            <AntDesign name="bars" size={20} color={iconColor} />
            <Text fontFamily="SourceSansPro" fontSize={17} color={textColor}>
              All wallets overview
            </Text>
          </HStack>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.6}
          onPress={() => {
            onManage();
            onClose();
          }}
          style={{
            height: ROW_HEIGHT,
            width: "100%",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
          }}>
          <HStack space={3} alignItems="center">
            <MaterialCommunityIcons name="wallet-outline" size={20} color={iconColor} />
            <Text fontFamily="SourceSansPro" fontSize={17} color={textColor}>
              Manage wallets
            </Text>
          </HStack>
        </TouchableOpacity>
      </Actionsheet.Content>
    </Actionsheet>
  );
};

export default WalletPickerSheet;
