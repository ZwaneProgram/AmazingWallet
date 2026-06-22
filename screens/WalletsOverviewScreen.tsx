import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Box,
  VStack,
  HStack,
  Divider,
  Spinner,
  FlatList,
} from "native-base";
import { SafeAreaView, TouchableOpacity } from "react-native";
import { AntDesign, Feather } from "@expo/vector-icons";
import { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { StatusBar } from "expo-status-bar";
import moment from "moment";
import { RootState } from "../redux/store";
import COLORS from "../colors";
import { WalletService } from "../api/services/WalletService";
import { WalletSummary } from "../interfaces/Wallet";
import { renderCategoryIcon } from "../utils/categoryIcons";

interface WalletsOverviewScreenProps {
  navigation: NavigationProp<ParamListBase>;
}

const WalletsOverviewScreen: React.FC<WalletsOverviewScreenProps> = ({ navigation }) => {
  const user: any = useSelector((state: RootState) => state.user);
  const [summaries, setSummaries] = useState<WalletSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const selectedYear = user.year || moment().year();
      const monthNumber = moment(user.month, "MMMM").month();
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

      try {
        const data = await WalletService.getWalletSummaries(user.id, startOfMonth, endOfMonth);
        setSummaries(data);
      } catch (err) {
        console.log("WalletsOverviewScreen load error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user.id, user.month, user.year]);

  const totalBalance = summaries.reduce((acc, s) => acc + s.balance, 0);

  const renderItem = ({ item: s }: { item: WalletSummary }) => (
    <Box bg="muted.50" borderRadius={16} shadow={2} px={5} py={4} mb={3}>
      <HStack alignItems="center" space={3} mb={3}>
        <Box
          width="44px"
          height="44px"
          borderRadius={14}
          justifyContent="center"
          alignItems="center"
          style={{ backgroundColor: s.color ?? COLORS.PURPLE[700] }}>
          {renderCategoryIcon(s.icon ?? "cash", s.name, 24, "#fff")}
        </Box>
        <Text fontFamily="SourceBold" fontSize={18} flex={1} numberOfLines={1}>
          {s.name}
        </Text>
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
          <FlatList
            data={summaries}
            keyExtractor={(item) => String(item.walletId)}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListHeaderComponent={
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
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default WalletsOverviewScreen;
