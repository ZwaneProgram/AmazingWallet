import React from "react";
import { Actionsheet, Box, HStack, Text } from "native-base";
import { ScrollView, TouchableOpacity } from "react-native";
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { Wallet } from "../interfaces/Wallet";
import { renderCategoryIcon } from "../utils/categoryIcons";
import { RootState } from "../redux/store";
import COLORS from "../colors";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  activeWalletId: number;
  onSelect: (walletId: number) => void;
  onManage: () => void;
  onOverview: () => void;
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
}) => {
  const isDark = useSelector((state: RootState) => state.user.theme) === "dark";
  const textColor = isDark ? "#ffffff" : "#262626";
  const iconColor = isDark ? COLORS.MUTED[300] : COLORS.MUTED[500];
  const sheetBg = isDark ? "#1f2937" : "#ffffff";
  const activeBg = isDark ? "#3b2e63" : COLORS.PURPLE[100];
  const activeTint = isDark ? COLORS.PURPLE[300] : COLORS.PURPLE[700];

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
          {renderCategoryIcon(w.icon ?? "cash", w.name, 22, w.color || COLORS.PURPLE[700])}
          <Text
            fontFamily="SourceSansPro"
            fontSize={17}
            color={isActive ? activeTint : textColor}>
            {w.name}
          </Text>
        </HStack>
        {isActive && <AntDesign name="check" size={18} color={activeTint} />}
      </TouchableOpacity>
    );
  });

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <Actionsheet.Content
        bg={sheetBg}
        style={{ backgroundColor: sheetBg, paddingBottom: 8 }}>
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
