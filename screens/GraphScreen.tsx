import { NavigationProp, ParamListBase } from "@react-navigation/native";
import {
  View,
  Text,
  Box,
  VStack,
  Circle,
  HStack,
  ScrollView,
  Pressable,
  useTheme,
} from "native-base";
import React, { useLayoutEffect, useState, Fragment } from "react";
import PieChart from "react-native-pie-chart";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { StatusBar } from "expo-status-bar";
import { categoryRollupSelector, monthTotalSelector } from "../redux/expensesReducers";
import EZHeaderTitle from "../components/shared/EzHeaderTitle";
import { NoChartData } from "../assets/SVG";
import { renderCategoryIcon } from "../utils/categoryIcons";
import COLORS from "../colors";
import { AntDesign } from "@expo/vector-icons";

interface GraphScreenProps {
  navigation: NavigationProp<ParamListBase>;
}

const GraphScreen: React.FC<GraphScreenProps> = ({ navigation }) => {
  const user = useSelector((state: RootState) => state.user);
  const { expenses } = useSelector((state: RootState) => state.expenses);
  const rollup = useSelector(categoryRollupSelector);
  const monthTotal = useSelector(monthTotalSelector);
  const {
    colors: { muted },
  } = useTheme();

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <EZHeaderTitle>Graph Reports</EZHeaderTitle>,
    });
  }, [navigation]);

  const hasData = expenses && expenses.length > 0 && rollup.length > 0;
  const series = hasData ? rollup.map((r: any) => r.effectiveTotal) : [1];
  const colors = hasData
    ? rollup.map((r: any) => r.color || COLORS.MUTED[400])
    : [muted[200] as string];

  const toggle = (id: number) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const openCategory = (name: string, catId: number, subIds: number[]) => {
    const list = (expenses as any[]).filter(
      (e: any) => e.categoryId === catId || subIds.includes(e.categoryId)
    );
    (navigation as any).navigate("CategoryExpenses", { expenses: list, name });
  };

  return (
    <View pt={10} flex={1} alignItems="center" flexDirection="column" style={{ gap: 20 }}>
      <StatusBar style="light" />
      <Box
        flexDirection="row"
        justifyContent={hasData ? "space-between" : "center"}
        w="90%"
        py={4}
        px={2}
        style={{
          shadowColor: "#171717",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        }}
        bg="muted.50"
        borderRadius={20}>
        {hasData ? (
          <Fragment>
            <Box bg="muted.50" style={{ alignItems: "center", justifyContent: "center" }}>
              <PieChart
                widthAndHeight={170}
                series={series}
                sliceColor={colors}
                coverRadius={0.75}
                coverFill={muted[50]}
              />
              <View position="absolute" alignItems="center" justifyContent="center">
                <VStack alignItems="center">
                  <Text fontSize={16} fontFamily="SourceBold" color="muted.500">
                    Total
                  </Text>
                  <Text fontSize={22} fontFamily="SourceBold">
                    {user.symbol} {monthTotal.toFixed(2)}
                  </Text>
                </VStack>
              </View>
            </Box>
            <VStack space={2}>
              <ScrollView flex={1} showsVerticalScrollIndicator={false}>
                <VStack space={2}>
                  {rollup.map((parent: any) => {
                    const pct = monthTotal ? (parent.effectiveTotal * 100) / monthTotal : 0;
                    return (
                      <HStack space={2} alignItems="center" key={parent.id}>
                        <Circle
                          size="10px"
                          style={{ backgroundColor: parent.color || COLORS.MUTED[400] }}
                        />
                        <Text fontFamily="SourceBold">
                          {parent.name} ({pct.toFixed(0)}%)
                        </Text>
                      </HStack>
                    );
                  })}
                </VStack>
              </ScrollView>
            </VStack>
          </Fragment>
        ) : (
          <VStack space="10px">
            <NoChartData height={140} width={200} />
            <Text textAlign="center" fontSize={17} fontFamily="SourceBold">
              No data to display
            </Text>
          </VStack>
        )}
      </Box>

      <ScrollView w="100%" flex={1} px={5} showsVerticalScrollIndicator={false}>
        <VStack space={4} pb={6}>
          {rollup.map((parent: any) => {
            const hasSubs = parent.subTotals.length > 0;
            const isOpen = !!expanded[parent.id];
            return (
              <VStack key={parent.id} space={3}>
                <Pressable
                  onPress={() =>
                    hasSubs ? toggle(parent.id) : openCategory(parent.name, parent.id, [])
                  }
                  _pressed={{ opacity: 0.6 }}>
                  <HStack alignItems="center" width="100%" justifyContent="space-between">
                    <HStack alignItems="center" space={4} flex={1}>
                      <Box
                        borderRadius={24}
                        width="60px"
                        height="60px"
                        style={{ backgroundColor: parent.color || COLORS.PURPLE[700] }}
                        justifyContent="center"
                        alignItems="center">
                        {renderCategoryIcon(parent.icon, parent.name, 22, COLORS.MUTED[50])}
                      </Box>
                      <VStack>
                        <HStack alignItems="center" space={1}>
                          <Text fontFamily="SourceBold" fontSize={15}>
                            {parent.name}
                          </Text>
                          {hasSubs && (
                            <AntDesign
                              name={isOpen ? "up" : "down"}
                              size={12}
                              color={COLORS.MUTED[500]}
                            />
                          )}
                        </HStack>
                        <Text fontFamily="SourceSansPro" color="muted.500">
                          {hasSubs ? `${parent.subTotals.length} sub-categories` : "Tap to view"}
                        </Text>
                      </VStack>
                    </HStack>
                    <Text fontFamily="SourceBold" fontSize={17}>
                      {user.symbol} {parent.effectiveTotal.toFixed(2)}
                    </Text>
                  </HStack>
                </Pressable>

                {hasSubs && isOpen && (
                  <VStack space={2} pl={16}>
                    {parent.directTotal > 0 && (
                      <HStack justifyContent="space-between" alignItems="center">
                        <Text fontFamily="SourceSansPro" color="muted.500">
                          {parent.name} (general)
                        </Text>
                        <Text fontFamily="SourceBold" color="muted.500">
                          {user.symbol} {parent.directTotal.toFixed(2)}
                        </Text>
                      </HStack>
                    )}
                    {parent.subTotals.map((sub: any) => (
                      <Pressable
                        key={sub.id}
                        onPress={() => openCategory(sub.name, sub.id, [])}
                        _pressed={{ opacity: 0.6 }}>
                        <HStack justifyContent="space-between" alignItems="center">
                          <HStack alignItems="center" space={3}>
                            <Box
                              width="30px"
                              height="30px"
                              borderRadius={12}
                              justifyContent="center"
                              alignItems="center"
                              style={{ backgroundColor: sub.color || COLORS.PURPLE[700] }}>
                              {renderCategoryIcon(sub.icon, sub.name, 16, COLORS.MUTED[50])}
                            </Box>
                            <Text fontFamily="SourceBold" fontSize={14}>
                              {sub.name}
                            </Text>
                          </HStack>
                          <Text fontFamily="SourceBold" fontSize={14}>
                            {user.symbol} {sub.total.toFixed(2)}
                          </Text>
                        </HStack>
                      </Pressable>
                    ))}
                  </VStack>
                )}
              </VStack>
            );
          })}
        </VStack>
      </ScrollView>
    </View>
  );
};
export default GraphScreen;
