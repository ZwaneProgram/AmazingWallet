import { NavigationProp, ParamListBase } from "@react-navigation/native";
import { Text, useTheme, VStack } from "native-base";
import EZInput from "../components/shared/EZInput";
import { authInput } from "../commonStyles";
import { WalletService } from "../api/services/WalletService";
import React, { useState } from "react";
import { SafeAreaView, TouchableOpacity } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { AntDesign } from "@expo/vector-icons";
import MonthlyBudgetItem from "../components/MonthlyBudgetItem";
import { Category } from "../interfaces/Category";
import { renderCategoryIcon } from "../utils/categoryIcons";
import { UserService } from "../api/services/UserService";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { Budget } from "../interfaces/Budget";
import EZButton from "../components/shared/EZButton";
import { useAccent } from "../hooks/useAccent";
import { StatusBar } from "expo-status-bar";
import {
  categoriesSelector,
  editBudgetsAction,
  monthlyBudgetsSelector,
  setWalletsAction,
  walletsSelector,
} from "../redux/expensesReducers";

interface EditBudgetScreenProps {
  navigation: NavigationProp<ParamListBase>;
}

const EditBudgetScreen: React.FC<EditBudgetScreenProps> = ({ navigation }) => {
  const user = useSelector((state: RootState) => state.user);
  const accent = useAccent();
  const [buttonLoading, setButtonLoading] = useState<boolean>(false);
  const [budgets, setBudgets] = useState<any>([]);
  const dispatch = useDispatch();
  const monthlyBudgets = useSelector(monthlyBudgetsSelector);
  const categories = useSelector(categoriesSelector);
  const wallets = useSelector(walletsSelector);
  const activeWallet = wallets.find((w: any) => w.id === user.activeWalletId);
  const activeWalletName = activeWallet?.name ?? "";
  const [overallBudget, setOverallBudget] = useState<string>(
    activeWallet?.overallBudget ? String(activeWallet.overallBudget).replace(".", ",") : ""
  );
  const {
    colors: { muted },
  } = useTheme();

  const closeModal = () => {
    navigation.goBack();
  };

  const handleValues = (value: string, category: Category) => {
    const element = budgets.find((item: Budget) => item.category === category.name);

    let newValues;
    const formatAmount = value.replace(",", ".");
    const numericFormat = Number(formatAmount);

    if (element) {
      newValues = budgets.map((item: any) =>
        item === element ? { ...item, budget: numericFormat } : item
      );
    } else {
      newValues = [
        ...budgets,
        {
          budget: numericFormat,
          category: category.name,
          color: category.color,
          id: category.id,
        },
      ];
    }

    setBudgets(newValues);
  };

  const saveBudgets = async () => {
    setButtonLoading(true);
    await UserService.saveUserBudgets(user.id, user.activeWalletId, budgets);
    const overallValue = Number(overallBudget.replace(",", ".")) || 0;
    await WalletService.updateOverallBudget(user.activeWalletId, overallValue);
    dispatch(editBudgetsAction(budgets));
    dispatch(
      setWalletsAction(
        wallets.map((w: any) =>
          w.id === user.activeWalletId ? { ...w, overallBudget: overallValue } : w
        )
      )
    );
    setButtonLoading(false);
    navigation.goBack();
  };

  const budgetValues: Budget[] = [];

  const budgetCategories = categories!
    .filter((category: Category) => !category.parentId)
    .map((category: Category) => {
    const budget = monthlyBudgets.find((item: Budget) => item.category === category.name);

    budgetValues.push(
      budget
        ? { ...budget, categoryId: category.id }
        : { budget: 0, category: category.name, categoryId: category.id }
    );

    return {
      id: category.id,
      name: category.name,
      color: category.color,
      icon: renderCategoryIcon(category.icon, category.name, 24, muted[50]),
      budget: budget ? budget.budget : 0,
    };
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: user.theme === "dark" ? "#111827" : "#ffffff" }}>
      <StatusBar style={user.theme === "dark" ? "light" : "dark"} />
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: user.theme === "dark" ? "#111827" : "#ffffff" }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>

        <VStack mt={10} space={6} px={7}>
          <TouchableOpacity
            style={{
              position: "absolute",
              right: 30,
              top: 0,
              zIndex: 9999,
            }}
            onPress={closeModal}>
            <AntDesign name="close" color={muted[900]} size={24} />
          </TouchableOpacity>
          <Text textAlign="center" fontFamily="SourceBold" fontSize={26}>
            Edit your monthly budgets
          </Text>
          {activeWalletName ? (
            <Text textAlign="center" fontFamily="SourceSansPro" fontSize={16} color={muted[500]}>
              {activeWalletName}
            </Text>
          ) : null}

          <VStack space={2}>
            <Text fontFamily="SourceBold" fontSize={18}>
              Overall budget
            </Text>
            <EZInput
              style={{ ...authInput, fontSize: 18 }}
              formHeight="45px"
              keyboardType="decimal-pad"
              type="text"
              placeholder="0"
              value={overallBudget}
              onChangeText={setOverallBudget}
              borderRadius={12}
              borderColor="muted.200"
              alignItems="flex-end"
            />
            <Text fontFamily="SourceSansPro" fontSize={13} color={muted[400]}>
              A spending cap for the whole wallet, not tied to any category.
            </Text>
          </VStack>

          {budgetCategories.map((category: Category, index: number) => (
            <MonthlyBudgetItem
              category={category}
              key={index}
              onChange={(e: string) => handleValues(e, category)}
            />
          ))}

          <EZButton
            onPress={saveBudgets}
            variant="solid"
            isLoading={buttonLoading}
            w="100%"
            bg="purple.700"
            borderRadius={8}
            height="44px"
            _text={{ fontFamily: "SourceSansPro", fontSize: 17 }}
            _pressed={{
              backgroundColor: accent[700],
              opacity: 0.7,
            }}>
            SAVE
          </EZButton>
        </VStack>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default EditBudgetScreen;
