import { useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { removeCurrency, removeUser, setCurrency, setThemeAction } from "../redux/userReducer";
import React, { useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  HStack,
  VStack,
  Circle,
  Actionsheet,
  useColorMode,
  useTheme,
} from "native-base";
import { TouchableOpacity, Alert, Switch } from "react-native";
import EZHeaderTitle from "../components/shared/EzHeaderTitle";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CurrencyService } from "../api/services/CurrencyService";
import { RootState } from "../redux/store";
import COLORS from "../colors";
import { ExpenseService } from "../api/services/ExpenseService";
import { IncomeService } from "../api/services/IncomeService";
import { setBudgetsAction, setExpensesAction, setIncomesAction } from "../redux/expensesReducers";
import moment from "moment";
import { Ionicons, FontAwesome, AntDesign } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppStackParamList } from "../interfaces/Navigation";
import { UserService } from "../api/services/UserService";
import { StatusBar } from "expo-status-bar";

const SettingsScreen: React.FC<any> = () => {
  const dispatch = useDispatch();
  const user: any = useSelector((state: RootState) => state.user);
  const {
    colors: { muted },
  } = useTheme();

  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [notificationsAllowed, toggleNotificationsAllowed] = useState<boolean>(false);
  const [theme, toggleTheme] = useState<boolean>(user.theme === "light" ? false : true);

  const [isCurrencyOpen, setIsCurrencyOpen] = useState<boolean>(false);
  const { toggleColorMode } = useColorMode();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <EZHeaderTitle>Settings</EZHeaderTitle>,
    });
  }, [navigation]);

  const displayLogoutAlert = () => {
    Alert.alert("Log out", "Are you sure you want to log out ?", [
      {
        text: "No",

        style: "cancel",
      },
      { text: "Yes", onPress: () => logout(), style: "destructive" },
    ]);
  };

  const logout: any = () => {
    dispatch(removeUser());
    dispatch(removeCurrency());
    navigation.navigate("Login");
  };

  const getCurrencies = async () => {
    if (!currencies.length) {
      const data = await CurrencyService.getAllCurrencies();

      let currenciesArray = [];

      for (const item in data) {
        currenciesArray.push({
          label: `${data[item].symbol_native} ${data[item].code}`,
          value: `${data[item].symbol_native} ${data[item].code}`,
        });
      }

      setCurrencies(currenciesArray);
    }
  };

  const switchTheme = () => {
    toggleColorMode();
    dispatch(setThemeAction(user.theme === "light" ? "dark" : "light"));
    toggleTheme(!theme);
  };

  const openCurrencyPicker = async () => {
    await getCurrencies();
    setIsCurrencyOpen(true);
  };

  const onSelectCurrency = (currencyValue: string) => {
    setIsCurrencyOpen(false);
    applyCurrency(currencyValue);
  };

  const applyCurrency = async (currencyValue: string) => {
    const baseCurrency = currencyValue.split(" ");
    const currentCurrency = user.currency;
    const currencyToChange = baseCurrency[1];

    if (currencyToChange === currentCurrency) {
      return;
    }

    const data = await CurrencyService.getCurrencyConversionRate(currentCurrency, currencyToChange);

    const conversionRate = data[currencyToChange];

    await CurrencyService.updateUserCurrency(user.id, baseCurrency[0], baseCurrency[1]);
    await ExpenseService.convertExpensesCurrency(user.id, conversionRate);
    await UserService.convertUserBudgetsCurrency(user.id, conversionRate);
    await IncomeService.convertIncomesCurrency(user.id, conversionRate);

    const parsedMonth = moment(user.month, "MMMM");
    const monthNumber = parsedMonth.month();
    const selectedYear = user.year || moment().year();
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

    const expenses = await ExpenseService.getMonthExpenses(user.id, startOfMonth, endOfMonth, user.activeWalletId);
    const budgets = await UserService.getUserBudgets(user.id, user.activeWalletId);
    const incomes = await IncomeService.getMonthIncomes(user.id, startOfMonth, endOfMonth, user.activeWalletId);

    dispatch(setCurrency({ name: baseCurrency[1], symbol: baseCurrency[0] }));
    dispatch(setExpensesAction(expenses));
    dispatch(setBudgetsAction(budgets));
    dispatch(setIncomesAction(incomes));

    Alert.alert("Currency updated", "All your expenses were updated with the new currency", [
      { text: "OK" },
    ]);
  };

  const displayEraseDataAlert = () => {
    Alert.alert(
      "Erase data",
      "This will delete all your expenses and budgets, are you sure you want to continue ?",
      [
        {
          text: "No",

          style: "cancel",
        },
        { text: "Yes", onPress: async () => await eraseData(), style: "destructive" },
      ]
    );
  };

  const removeExpenses = async () => {
    await ExpenseService.removeUserExpenses(user.id);
  };

  const removeBudgets = async () => {
    await UserService.removeUserBudgets(user.id);
  };

  const removeIncomes = async () => {
    await IncomeService.removeUserIncomes(user.id);
  };

  const eraseData = async () => {
    await Promise.all([removeExpenses(), removeBudgets(), removeIncomes()]);

    dispatch(setExpensesAction([]));
    dispatch(setBudgetsAction([]));
    dispatch(setIncomesAction([]));

    Alert.alert("Completed", "Your data has been erased !", [{ text: "Ok" }]);
  };

  const SECTIONS = [
    {
      header: "Preferences",
      icon: "settings",
      items: [
        {
          icon: <MaterialCommunityIcons name="shape" size={18} color={COLORS.MUTED[50]} />,
          color: "#8b5cf6",
          label: "Manage categories",
          onPress: () => navigation.navigate("ManageCategories"),
          rightElement: <FontAwesome name="angle-right" size={26} color={muted[900]} />,
          disabled: false,
        },
        {
          icon: <MaterialCommunityIcons name="wallet-outline" size={18} color={COLORS.MUTED[50]} />,
          color: "#6d28d9",
          label: "Manage wallets",
          onPress: () => navigation.navigate("ManageWallets"),
          rightElement: <FontAwesome name="angle-right" size={26} color={muted[900]} />,
          disabled: false,
        },
        {
          icon: <MaterialCommunityIcons name="currency-eur" size={18} color={COLORS.MUTED[50]} />,
          color: "#fe9400",
          label: "Currency ",
          onPress: () => openCurrencyPicker(),
          rightElement: (
            <HStack alignItems="center" space={1}>
              <Text color="purple.700" fontFamily="SourceBold" fontSize={17}>
                {user.symbol} {user.currency}
              </Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.PURPLE[700]} />
            </HStack>
          ),
          disabled: false,
        },
        {
          icon: (
            <Ionicons
              name={notificationsAllowed ? "notifications" : "notifications-off"}
              size={18}
              color={COLORS.MUTED[50]}
            />
          ),
          color: "primary.500",
          label: "Notifications",
          onPress: () => toggleNotificationsAllowed(!notificationsAllowed),
          rightElement: (
            <Switch
              value={notificationsAllowed}
              onValueChange={() => toggleNotificationsAllowed(!notificationsAllowed)}
            />
          ),
          disabled: true,
        },
        {
          icon: <Ionicons name={theme ? "moon" : "sunny"} size={18} color={COLORS.MUTED[50]} />,
          color: "violet.800",
          label: user.theme === "light" ? "Light theme" : "Dark theme",

          rightElement: <Switch value={theme} onValueChange={() => switchTheme()} />,
          disabled: true,
        },
        {
          icon: <MaterialCommunityIcons name="eraser" size={18} color={COLORS.MUTED[50]} />,
          color: "rose.600",
          label: "Erase data",
          onPress: () => displayEraseDataAlert(),
          disabled: false,
        },
      ],
    },

    {
      header: "Help",
      icon: "align-center",
      items: [
        {
          icon: <FontAwesome name="lock" size={18} color={COLORS.MUTED[50]} />,
          color: "orange.800",
          label: "Change password",
          rightElement: <FontAwesome name="angle-right" size={26} color={muted[900]} />,
          onPress: () => navigation.navigate("ChangePassword"),
          disabled: false,
        },
        {
          icon: <Ionicons name="newspaper-sharp" size={18} color={COLORS.MUTED[50]} />,
          color: "green.500",
          label: "About",
          rightElement: <FontAwesome name="angle-right" size={26} color={muted[900]} />,
          onPress: () => navigation.navigate("About"),
          disabled: false,
        },
        {
          icon: <AntDesign name="logout" size={18} color={COLORS.MUTED[50]} />,
          color: "yellow.500",
          label: "Logout",
          onPress: () => displayLogoutAlert(),
          rightElement: <FontAwesome name="angle-right" size={26} color={muted[900]} />,
          disabled: false,
        },
      ],
    },
  ];

  return (
    <View flex={1}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingVertical: 24 }}>
        {SECTIONS.map(({ header, items }, key) => (
          <View paddingX={"24px"} key={key}>
            <Text
              paddingY={"12px"}
              fontSize={14}
              color="muted.500"
              textTransform="uppercase"
              letterSpacing={1.1}
              fontFamily="SourceBold">
              {header}
            </Text>
            <VStack space={"12px"}>
              {items.map(({ label, icon, color, rightElement, onPress, disabled }, index) => {
                return (
                  <TouchableOpacity key={index} onPress={onPress} disabled={disabled}>
                    <HStack
                      alignItems="center"
                      justifyContent="space-between"
                      height={50}
                      bg={user.theme === "dark" ? "muted.50" : "muted.200"}
                      borderRadius={8}
                      paddingX={"12px"}>
                      <HStack space="12px" alignItems="center">
                        <Circle bg={color} size="32px">
                          {icon}
                        </Circle>
                        <Text fontSize={17} color="muted.900">
                          {label}
                        </Text>
                      </HStack>
                      {rightElement}
                    </HStack>
                  </TouchableOpacity>
                );
              })}
            </VStack>
          </View>
        ))}
      </ScrollView>

      <Actionsheet isOpen={isCurrencyOpen} onClose={() => setIsCurrencyOpen(false)}>
        <Actionsheet.Content
          bg={user.theme === "dark" ? "#1f2937" : "white"}
          style={{ backgroundColor: user.theme === "dark" ? "#1f2937" : "#ffffff" }}>
          <ScrollView w="100%" maxH={400}>
            {currencies.map((item) => {
              const isSelected = item.value === `${user.symbol} ${user.currency}`;
              return (
                <Actionsheet.Item
                  key={item.value}
                  onPress={() => onSelectCurrency(item.value)}
                  bg={isSelected ? "purple.100" : user.theme === "dark" ? "#1f2937" : "#ffffff"}
                  _hover={{
                    bg: isSelected
                      ? "purple.100"
                      : user.theme === "dark"
                      ? "#374151"
                      : COLORS.MUTED[200],
                  }}
                  _pressed={{ bg: user.theme === "dark" ? "#374151" : COLORS.MUTED[200] }}
                  _text={{
                    fontFamily: "SourceBold",
                    color: isSelected
                      ? "purple.700"
                      : user.theme === "dark"
                      ? "#ffffff"
                      : "#262626",
                  }}>
                  {item.label}
                </Actionsheet.Item>
              );
            })}
          </ScrollView>
        </Actionsheet.Content>
      </Actionsheet>
    </View>
  );
};
export default SettingsScreen;
