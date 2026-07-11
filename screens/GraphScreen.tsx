import { NavigationProp, ParamListBase, useIsFocused } from "@react-navigation/native";
import {
  View,
  Text,
  Box,
  VStack,
  Circle,
  HStack,
  ScrollView,
  Pressable,
  Spinner,
  useTheme,
} from "native-base";
import React, { useEffect, useLayoutEffect, useMemo, useState, Fragment } from "react";
import { TouchableOpacity } from "react-native";
import PieChart from "react-native-pie-chart";
import { useSelector } from "react-redux";
import moment from "moment";
import { getPeriodRange } from "../utils/period";
import { RootState } from "../redux/store";
import { StatusBar } from "expo-status-bar";
import { categoriesSelector } from "../redux/expensesReducers";
import { computeCategoryRollup } from "../utils/categoryRollup";
import { ExpenseService } from "../api/services/ExpenseService";
import EZHeaderTitle from "../components/shared/EzHeaderTitle";
import MonthYearPickerModal from "../components/MonthYearPickerModal";
import { NoChartData } from "../assets/SVG";
import { renderCategoryIcon } from "../utils/categoryIcons";
import COLORS from "../colors";
import { useAccent } from "../hooks/useAccent";
import { AntDesign, Feather } from "@expo/vector-icons";
import { SHADOWS } from "../theme/designSystem";

interface GraphScreenProps {
  navigation: NavigationProp<ParamListBase>;
}

const GraphScreen: React.FC<GraphScreenProps> = ({ navigation }) => {
  const isFocused = useIsFocused();
  const user = useSelector((state: RootState) => state.user);
  const categories = useSelector(categoriesSelector);
  const accent = useAccent();
  const {
    colors: { muted },
  } = useTheme();

  // The Graph keeps its OWN period, independent of Home. It starts mirroring
  // whatever month Home is on, then the user can page it freely without
  // touching Home's selection.
  const [graphMonth, setGraphMonth] = useState<string>(user.month || moment().format("MMMM"));
  const [graphYear, setGraphYear] = useState<number>(user.year || moment().year());
  const [graphMode, setGraphMode] = useState<"month" | "all">("month");
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [graphExpenses, setGraphExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <EZHeaderTitle>Graph Reports</EZHeaderTitle>,
    });
  }, [navigation]);

  const loadExpenses = async () => {
    let startOfMonth: string;
    let endOfMonth: string;
    if (graphMode === "all") {
      startOfMonth = moment().year(graphYear).startOf("year").format("YYYY-MM-DD");
      endOfMonth = moment().year(graphYear).endOf("year").format("YYYY-MM-DD");
    } else {
      const parsedMonth = moment(graphMonth, "MMMM");
      if (!parsedMonth.isValid()) return;
      ({ start: startOfMonth, end: endOfMonth } = getPeriodRange(
        graphMonth,
        graphYear,
        user.cycleStartDay || 1
      ));
    }

    setLoading(true);
    const data = await ExpenseService.getMonthExpenses(
      user.id,
      startOfMonth,
      endOfMonth,
      user.activeWalletId
    );
    setGraphExpenses(data ?? []);
    setLoading(false);
  };

  // Reload whenever the period, the active wallet, or focus changes (so newly
  // added expenses show up when the user returns to this tab).
  useEffect(() => {
    if (isFocused) {
      loadExpenses();
    }
  }, [graphMonth, graphYear, graphMode, user.activeWalletId, isFocused]);

  // Arrows page months in month-mode, years in all-mode.
  const shiftPeriod = (delta: number) => {
    if (graphMode === "all") {
      setGraphYear((y) => y + delta);
      return;
    }
    const next = moment().year(graphYear).month(moment(graphMonth, "MMMM").month()).add(delta, "month");
    setGraphMonth(next.format("MMMM"));
    setGraphYear(next.year());
  };

  const rollup = useMemo(
    () => computeCategoryRollup(graphExpenses as any, categories),
    [graphExpenses, categories]
  );
  const monthTotal = useMemo(
    () => graphExpenses.reduce((acc: number, e: any) => acc + Number(e.amount), 0),
    [graphExpenses]
  );

  const hasData = graphExpenses.length > 0 && rollup.length > 0;
  const series = hasData ? rollup.map((r: any) => r.effectiveTotal) : [1];
  const colors = hasData
    ? rollup.map((r: any) => r.color || COLORS.MUTED[400])
    : [muted[200] as string];

  const toggle = (id: number) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const openCategory = (name: string, catId: number, subIds: number[]) => {
    const list = (graphExpenses as any[]).filter(
      (e: any) => e.categoryId === catId || subIds.includes(e.categoryId)
    );
    (navigation as any).navigate("CategoryExpenses", { expenses: list, name });
  };

  return (
    <View pt={6} flex={1} alignItems="center" flexDirection="column" w="100%" maxW="640px" alignSelf="center" style={{ gap: 16 }}>
      <StatusBar style="light" />

      {/* Period picker — independent of Home */}
      <HStack w="90%" alignItems="center" justifyContent="space-between" px={1}>
        <TouchableOpacity
          onPress={() => shiftPeriod(-1)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AntDesign name="left" size={22} color={accent[700]} />
        </TouchableOpacity>
        <Pressable onPress={() => setPickerOpen(true)} _pressed={{ opacity: 0.6 }}>
          <HStack
            space={2}
            alignItems="center"
            px={4}
            py={2}
            borderRadius={20}
            style={SHADOWS.pill as any}
            bg={user.theme === "dark" ? "muted.50" : "muted.50"}>
            <Feather
              name="calendar"
              size={14}
              color={user.theme === "dark" ? COLORS.MUTED[300] : COLORS.MUTED[500]}
            />
            <Text fontFamily="SourceBold" fontSize={16}>
              {graphMode === "all" ? `All ${graphYear}` : `${graphMonth} ${graphYear}`}
            </Text>
            <AntDesign
              name="caret-down"
              size={10}
              color={user.theme === "dark" ? COLORS.MUTED[300] : COLORS.MUTED[500]}
            />
          </HStack>
        </Pressable>
        <TouchableOpacity
          onPress={() => shiftPeriod(1)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AntDesign name="right" size={22} color={accent[700]} />
        </TouchableOpacity>
      </HStack>

      <Box
        flexDirection="row"
        justifyContent={hasData ? "space-between" : "center"}
        w="90%"
        py={5}
        px={2}
        shadow={2}
        bg="muted.50"
        borderRadius={22}>
        {loading ? (
          <View w="100%" alignItems="center" justifyContent="center" py={16}>
            <Spinner color="purple.700" size="lg" />
          </View>
        ) : hasData ? (
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
                        style={{ backgroundColor: parent.color || accent[700] }}
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
                              style={{ backgroundColor: sub.color || accent[700] }}>
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

      <MonthYearPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        month={graphMonth}
        year={graphYear}
        allActive={graphMode === "all"}
        onSelect={(month, year) => {
          setGraphMode("month");
          setGraphMonth(month);
          setGraphYear(year);
        }}
        onSelectAll={(year) => {
          setGraphMode("all");
          setGraphYear(year);
        }}
      />
    </View>
  );
};
export default GraphScreen;
