import React from "react";
import { Actionsheet, Box, HStack, Text, VStack } from "native-base";
import { ScrollView, TouchableOpacity } from "react-native";
import { AntDesign, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { Wallet } from "../interfaces/Wallet";
import { renderCategoryIcon } from "../utils/categoryIcons";
import { RootState } from "../redux/store";
import COLORS from "../colors";
import { useAccent } from "../hooks/useAccent";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
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

  // Scroll only when there are enough wallets to overflow; otherwise the
  // list sizes to its content so the footer sits right beneath it.
  const needsScroll = wallets.length > 6;

  const walletRows = wallets.map((w) => {
    const isActive = w.id === activeWalletId;
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
          <Text
            fontFamily="SourceSansPro"
            fontSize={17}
            color={isActive ? activeTint : textColor}
            numberOfLines={1}>
            {w.name}
          </Text>
        </HStack>
        <HStack space={2} alignItems="center">
          <Text
            fontFamily="SourceBold"
            fontSize={15}
            style={{ color: balanceColor(balances?.[w.id!]) }}>
            {fmtBalance(balances?.[w.id!])}
          </Text>
          {isActive && <AntDesign name="check" size={16} color={activeTint} />}
        </HStack>
      </TouchableOpacity>
    );
  });

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
                across all wallets
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
