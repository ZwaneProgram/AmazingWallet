import React, { useState, useRef } from "react";
import { HStack, Text, VStack, View, Pressable, Box, useTheme } from "native-base";
import { SafeAreaView, TouchableOpacity } from "react-native";
import { AntDesign, FontAwesome, Ionicons } from "@expo/vector-icons";
import { NavigationProp, ParamListBase, RouteProp } from "@react-navigation/native";
import EZInput from "../components/shared/EZInput";
import { Category } from "../interfaces/Category";
import CategoryItem from "../components/CategoryItem";
import { renderCategoryIcon } from "../utils/categoryIcons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useFormik } from "formik";
import { expenseSchema } from "../schemas/expenseSchema";
import { incomeSchema } from "../schemas/incomeSchema";
import EZButton from "../components/shared/EZButton";
import CalculatorModal from "../components/CalculatorModal";
import COLORS from "../colors";
import { ExpenseService } from "../api/services/ExpenseService";
import { IncomeService } from "../api/services/IncomeService";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { StatusBar } from "expo-status-bar";
import { addExpenseAction, addIncomeAction, categoriesSelector, walletsSelector } from "../redux/expensesReducers";
import moment from "moment";
import { authInput } from "../commonStyles";

type TransactionType = "expense" | "income";

interface AddExpenseScreenProps {
  navigation: NavigationProp<ParamListBase>;
  route?: RouteProp<{ params?: { type?: TransactionType } }, "params">;
}

const AddExpenseScreen: React.FC<AddExpenseScreenProps> = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const scrollRef = useRef<any>(null);
  const {
    colors: { muted },
  } = useTheme();

  const user = useSelector((state: RootState) => state.user);
  const isDark = user.theme === "dark";
  const categories = useSelector(categoriesSelector);
  const wallets = useSelector(walletsSelector);
  const activeWalletName = wallets.find((w: any) => w.id === user.activeWalletId)?.name ?? "";
  const [loading, setLoading] = useState<boolean>(false);
  const [calcOpen, setCalcOpen] = useState<boolean>(false);
  const [type, setType] = useState<TransactionType>(route?.params?.type ?? "expense");

  const isIncome = type === "income";

  const formik = useFormik({
    initialValues: {
      amount: "",
      category: "",
      description: "",
    },
    validationSchema: isIncome ? incomeSchema : expenseSchema,
    onSubmit: async (values) => {
      const { amount, category, description } = values;

      try {
        const formatAmount = amount.replace(",", ".");
        const numericFormat = Number(formatAmount);

        if (isIncome) {
          const incomeCategory = categories.find((item: Category) => item.name === category);
          const income = {
            userId: Number(user.id),
            amount: numericFormat,
            description,
            walletId: user.activeWalletId,
            categoryId: incomeCategory?.id,
          };

          await IncomeService.addIncome(income);

          dispatch(
            addIncomeAction({
              ...income,
              payDate: moment().format("YYYY-MM-DD"),
              name: incomeCategory?.name,
              color: incomeCategory?.color,
            })
          );

          navigation.goBack();
          return;
        }

        const currentCategory = categories.find((item: Category) => item.name === category);

        const expense = {
          userId: Number(user.id),
          categoryId: Number(currentCategory!.id),
          amount: numericFormat,
          description,
          walletId: user.activeWalletId,
        };

        const today = moment().format("YYYY-MM-DD");
        await ExpenseService.AddExpense(expense);

        dispatch(
          addExpenseAction({
            ...expense,
            payDate: today,
            name: category,
            color: currentCategory.color,
          })
        );

        navigation.goBack();
      } catch (error) {
        console.log(error);
      }
    },
  });

  const handleValue = (label: string, value: string) => {
    if (label === "amount" && values.amount.includes(",") && value.slice(-1) === ",") {
      formik.setFieldValue(label, value.slice(0, -1));
    } else {
      formik.setFieldValue(label, value);
    }
  };

  const selectCategory = (value: string) => {
    formik.setFieldValue("category", value);
  };

  const { values, errors, submitForm, touched } = formik;

  const saveTransaction = async () => {
    setLoading(true);
    await submitForm();
    setLoading(false);
  };

  const switchType = (nextType: TransactionType) => {
    if (nextType === type) {
      return;
    }
    setType(nextType);
    formik.setErrors({});
    formik.setTouched({});
  };

  const accentColor = isIncome ? COLORS.EMERALD[500] : COLORS.PURPLE[700];

  // 2-level category picker: grid shows parents; a sub row appears for the selected parent.
  const parents = (categories as Category[]).filter((c: Category) => !c.parentId);
  const childrenOf = (id?: number) =>
    (categories as Category[]).filter((c: Category) => c.parentId === id);
  const selectedCat = (categories as Category[]).find((c: Category) => c.name === values.category);
  const selectedParent = selectedCat
    ? selectedCat.parentId
      ? (categories as Category[]).find((c: Category) => c.id === selectedCat.parentId)
      : selectedCat
    : undefined;
  const selectedParentName = selectedParent?.name ?? "";
  const selectedParentSubs = selectedParent ? childrenOf(selectedParent.id) : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: user.theme === "dark" ? "#111827" : "#ffffff" }}>
      <StatusBar style={user.theme === "dark" ? "light" : "dark"} />
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        ref={scrollRef}
        style={{ backgroundColor: user.theme === "dark" ? "#111827" : "#ffffff" }}
        contentContainerStyle={{ flexGrow: 1 }}
        onKeyboardWillHide={() => scrollRef.current.scrollToEnd()}>
        <TouchableOpacity
          style={{ position: "absolute", right: 40, top: 25, zIndex: 9999 }}
          onPress={() => navigation.goBack()}>
          <AntDesign name="close" size={24} color={muted[900]} />
        </TouchableOpacity>
        <View flex={1} pt={16} alignItems="center" justifyContent="space-between">
          <VStack alignItems="center" width="100%" maxW={520} px={6} space={8}>
            {/* Segmented Expense / Income toggle */}
            <HStack bg={user.theme === "dark" ? "muted.50" : "muted.100"} borderRadius={14} p={1} width="100%">
              {(["expense", "income"] as TransactionType[]).map((t) => {
                const active = type === t;
                return (
                  <Pressable key={t} flex={1} onPress={() => switchType(t)}>
                    <View
                      py={2.5}
                      borderRadius={11}
                      alignItems="center"
                      bg={active ? (t === "income" ? "emerald.500" : "purple.700") : "transparent"}>
                      <Text
                        fontFamily="SourceBold"
                        fontSize={16}
                        color={active ? "white" : "muted.500"}>
                        {t === "income" ? "Income" : "Expense"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </HStack>

            {activeWalletName ? (
              <Text fontFamily="SourceSansPro" fontSize={14} color={muted[500]} textAlign="center">
                Adding to: {activeWalletName}
              </Text>
            ) : null}

            <VStack space={4} alignItems="center" width="100%">
              <Text fontFamily="SourceBold" fontSize={32} textAlign="center">
                {isIncome ? "Add new income" : "Add new expense"}
              </Text>
              <EZInput
                returnKeyType="done"
                style={authInput}
                keyboardType="decimal-pad"
                type="text"
                value={values.amount}
                onChangeText={(e: string) => handleValue("amount", e)}
                label={`Enter amount ${user.symbol ?? ""}`}
                placeholder="0"
                borderRadius={12}
                borderColor="muted.100"
                InputRightElement={
                  <Pressable px={3} onPress={() => setCalcOpen(true)} _pressed={{ opacity: 0.5 }}>
                    <Ionicons name="calculator" size={24} color={accentColor} />
                  </Pressable>
                }
                placeholderTextColor="muted.300"
                _focus={{
                  backgroundColor: "transparent",
                  color: "purple.700",
                  placeholderTextColor: "purple.700",
                }}
                error={touched.amount && errors.amount}
              />

              {(
                <>
                  <Text alignSelf="flex-start" fontFamily="SourceSansPro" fontSize={20}>
                    {isIncome ? "Category (optional)" : "Category"}
                  </Text>
                  <Box
                    flexDirection="row"
                    flexWrap="wrap"
                    width="100%"
                    style={{ paddingTop: 5, paddingBottom: 5 }}>
                    {(parents as Category[]).map((item: Category) => (
                      <Box key={String(item.id)} width="50%" mb={3} alignItems="center">
                        <CategoryItem
                          disabled={false}
                          selectedCategory={selectedParentName}
                          category={item}
                          selectCategory={selectCategory}
                        />
                      </Box>
                    ))}
                  </Box>

                  {selectedParentSubs.length > 0 && (
                    <Box
                      width="100%"
                      bg={isDark ? "#1f2937" : "muted.100"}
                      borderRadius={16}
                      p={3}
                      style={{
                        borderLeftWidth: 4,
                        borderLeftColor: selectedParent!.color || COLORS.PURPLE[700],
                      }}>
                      {/* Header makes it read as a step *inside* the chosen category */}
                      <HStack alignItems="center" space={2} mb={3}>
                        <Box
                          width="30px"
                          height="30px"
                          borderRadius={10}
                          justifyContent="center"
                          alignItems="center"
                          style={{ backgroundColor: selectedParent!.color || COLORS.PURPLE[700] }}>
                          {renderCategoryIcon(selectedParent!.icon, selectedParent!.name, 17, "#fff")}
                        </Box>
                        <VStack>
                          <Text fontFamily="SourceBold" fontSize={15}>
                            {selectedParent!.name}
                          </Text>
                          <Text fontFamily="SourceSansPro" fontSize={12} color="muted.400">
                            Pick a subcategory (optional)
                          </Text>
                        </VStack>
                      </HStack>

                      <Box flexDirection="row" flexWrap="wrap" style={{ marginHorizontal: -4 }}>
                        {/* "General" = the parent itself, no sub */}
                        <Pressable
                          onPress={() => selectCategory(selectedParent!.name)}
                          style={{ margin: 4 }}>
                          <Box
                            px={3}
                            py={2}
                            borderRadius={12}
                            borderWidth={1.5}
                            borderColor={
                              values.category === selectedParent!.name
                                ? COLORS.EMERALD[400]
                                : isDark
                                ? "#374151"
                                : "muted.200"
                            }
                            bg={
                              values.category === selectedParent!.name
                                ? isDark
                                  ? "rgba(52,211,153,0.18)"
                                  : "#ecfdf5"
                                : isDark
                                ? "#111827"
                                : "muted.50"
                            }>
                            <Text
                              fontFamily="SourceBold"
                              fontSize={14}
                              color={
                                values.category === selectedParent!.name
                                  ? isDark
                                    ? COLORS.EMERALD[300]
                                    : COLORS.EMERALD[500]
                                  : undefined
                              }>
                              General
                            </Text>
                          </Box>
                        </Pressable>

                        {selectedParentSubs.map((sub: Category) => {
                          const subActive = values.category === sub.name;
                          return (
                            <Pressable
                              key={sub.id}
                              onPress={() => selectCategory(sub.name)}
                              style={{ margin: 4 }}>
                              <HStack
                                alignItems="center"
                                space={2}
                                px={3}
                                py={2}
                                borderRadius={12}
                                borderWidth={1.5}
                                borderColor={
                                  subActive ? COLORS.EMERALD[400] : isDark ? "#374151" : "muted.200"
                                }
                                bg={
                                  subActive
                                    ? isDark
                                      ? "rgba(52,211,153,0.18)"
                                      : "#ecfdf5"
                                    : isDark
                                    ? "#111827"
                                    : "muted.50"
                                }>
                                <Box
                                  width="26px"
                                  height="26px"
                                  borderRadius={10}
                                  justifyContent="center"
                                  alignItems="center"
                                  style={{ backgroundColor: sub.color || COLORS.PURPLE[700] }}>
                                  {renderCategoryIcon(sub.icon, sub.name, 15, "#fff")}
                                </Box>
                                <Text
                                  fontFamily="SourceBold"
                                  fontSize={14}
                                  color={
                                    subActive
                                      ? isDark
                                        ? COLORS.EMERALD[300]
                                        : COLORS.EMERALD[500]
                                      : undefined
                                  }>
                                  {sub.name}
                                </Text>
                              </HStack>
                            </Pressable>
                          );
                        })}
                      </Box>
                    </Box>
                  )}

                  {touched.category && errors.category && (
                    <HStack alignSelf="flex-start" alignItems="center" space={1}>
                      <FontAwesome name="close" size={20} color={COLORS.DANGER[500]} />
                      <Text color="danger.500" fontFamily="SourceBold">
                        {errors.category}
                      </Text>
                    </HStack>
                  )}
                </>
              )}

              <EZInput
                style={authInput}
                returnKeyType="done"
                type="text"
                label={isIncome ? "Note (optional)" : "Description (optional)"}
                placeholder={isIncome ? "Add a note" : "..."}
                value={values.description}
                onChangeText={(e: string) => handleValue("description", e)}
                borderRadius={12}
                borderColor="muted.200"
                error={touched.description && errors.description}
              />
            </VStack>

            <EZButton
              variant="solid"
              onPress={saveTransaction}
              w="100%"
              isLoading={loading}
              bg={accentColor}
              borderRadius={8}
              height="44px"
              mb={6}
              _text={{ fontFamily: "SourceSansPro", fontSize: 17 }}
              _pressed={{
                backgroundColor: accentColor,
                opacity: 0.7,
              }}>
              {isIncome ? "ADD INCOME" : "SAVE"}
            </EZButton>
          </VStack>
        </View>
      </KeyboardAwareScrollView>

      <CalculatorModal
        isOpen={calcOpen}
        onClose={() => setCalcOpen(false)}
        initialValue={values.amount}
        accentColor={accentColor}
        onResult={(value: string) => handleValue("amount", value)}
      />
    </SafeAreaView>
  );
};

export default AddExpenseScreen;
