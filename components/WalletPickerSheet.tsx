import React from "react";
import { Actionsheet, HStack, Text, ScrollView } from "native-base";
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
  const pressedBg = isDark ? "#374151" : COLORS.MUTED[200];
  return (
  <Actionsheet isOpen={isOpen} onClose={onClose}>
    <Actionsheet.Content
      bg={isDark ? "#1f2937" : "white"}
      style={{ backgroundColor: isDark ? "#1f2937" : "#ffffff" }}>
      <ScrollView w="100%" maxH={400}>
        {wallets.map((w) => {
          const isActive = w.id === activeWalletId;
          return (
            <Actionsheet.Item
              key={w.id}
              onPress={() => {
                onSelect(w.id!);
                onClose();
              }}
              bg={isActive ? "purple.100" : sheetBg}
              _hover={{ bg: isActive ? "purple.100" : pressedBg }}
              _pressed={{ bg: pressedBg }}
              _text={{
                fontFamily: "SourceSansPro",
                color: isActive ? "purple.700" : textColor,
              }}>
              <HStack space={3} alignItems="center" justifyContent="space-between" w="100%">
                <HStack space={3} alignItems="center" flex={1}>
                  {renderCategoryIcon(
                    w.icon ?? "cash",
                    w.name,
                    22,
                    w.color || COLORS.PURPLE[700]
                  )}
                  <Text
                    fontFamily="SourceSansPro"
                    fontSize={17}
                    color={isActive ? "purple.700" : textColor}>
                    {w.name}
                  </Text>
                </HStack>
                {isActive && (
                  <AntDesign name="check" size={18} color={COLORS.PURPLE[700]} />
                )}
              </HStack>
            </Actionsheet.Item>
          );
        })}
      </ScrollView>

      <Actionsheet.Item
        onPress={() => {
          onOverview();
          onClose();
        }}
        bg={sheetBg}
        _hover={{ bg: pressedBg }}
        _pressed={{ bg: pressedBg }}
        _text={{ fontFamily: "SourceSansPro", color: textColor }}>
        <HStack space={3} alignItems="center">
          <AntDesign name="bars" size={20} color={iconColor} />
          <Text fontFamily="SourceSansPro" fontSize={17} color={textColor}>
            All wallets overview
          </Text>
        </HStack>
      </Actionsheet.Item>

      <Actionsheet.Item
        onPress={() => {
          onManage();
          onClose();
        }}
        bg={sheetBg}
        _hover={{ bg: pressedBg }}
        _pressed={{ bg: pressedBg }}
        _text={{ fontFamily: "SourceSansPro", color: textColor }}>
        <HStack space={3} alignItems="center">
          <MaterialCommunityIcons name="wallet-outline" size={20} color={iconColor} />
          <Text fontFamily="SourceSansPro" fontSize={17} color={textColor}>
            Manage wallets
          </Text>
        </HStack>
      </Actionsheet.Item>
    </Actionsheet.Content>
  </Actionsheet>
  );
};

export default WalletPickerSheet;
