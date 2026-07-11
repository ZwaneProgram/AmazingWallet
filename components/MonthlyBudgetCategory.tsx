import { Box, HStack, Text, useTheme, VStack } from "native-base";
import React from "react";
import { renderCategoryIcon } from "../utils/categoryIcons";
import EZProgress from "./shared/EZProgress";
import { Budget } from "../interfaces/Budget";
import { Category } from "../interfaces/Category";
import { AntDesign } from "@expo/vector-icons";
import COLORS from "../colors";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { categoriesSelector } from "../redux/expensesReducers";
import { useAccent } from "../hooks/useAccent";

interface MonthlyBudgetCategoryProps {
  budget: Budget;
  monthlyTotal: number;
}

const MonthlyBudgetCategory: React.FC<MonthlyBudgetCategoryProps> = ({ budget, monthlyTotal }) => {
  const { budget: amount, category, color } = budget;
  const accent = useAccent();
  // Guard against empty/undefined colors from the DB — "" is not a valid color.
  const safeColor = color || accent[700];
  const user: any = useSelector((state: RootState) => state.user);
  const categories = useSelector(categoriesSelector);
  const iconKey = categories.find((c: Category) => c.name === category)?.icon;
  const {
    colors: { muted },
  } = useTheme();

  const budgetStatus = () => {
    const threshold = (amount * 75) / 100;

    let statusMessage = "";

    if (monthlyTotal >= threshold && monthlyTotal < amount) {
      statusMessage = "Almost exceeding";
    } else if (monthlyTotal >= amount) {
      statusMessage = "Budget exceeded !";
    }

    if (statusMessage) {
      return (
        <HStack pb={2} pl={4} alignItems="center" space={2}>
          <AntDesign name="exclamation-circle" size={15} color={COLORS.DANGER[500]} />
          <Text>{statusMessage}</Text>
        </HStack>
      );
    }

    return null;
  };

  return (
    <Box
      width="265px"
      height="165px"
      style={{
        shadowColor: "#171717",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }}
      bg="muted.50"
      borderRadius={20}>
      <VStack flex={1} pt={4} pl={4} pr={4} space={3}>
        <HStack space={3} alignItems="center">
          <Box
            borderRadius={22}
            width="60px"
            height="60px"
            style={{ backgroundColor: safeColor }}
            justifyContent="center"
            alignItems="center">
            {renderCategoryIcon(iconKey, category, 24, muted[50])}
          </Box>
          <Text fontFamily="SourceBold" fontSize={18}>
            {category}
          </Text>
        </HStack>

        <VStack>
          <Text>
            {monthlyTotal.toFixed(2)} {user.symbol} /{" "}
            {Number.isInteger(amount) ? amount : amount.toFixed(2)} {user.symbol}
          </Text>
          <EZProgress height="20px" maxValue={amount} value={monthlyTotal} color={safeColor} />
        </VStack>
      </VStack>
      {/* {isAlmostExceeded() && (
        <HStack pb={2} pl={4} alignItems="center" space={2}>
          <AntDesign
            name="exclamationcircle"
            size={15}
            color={COLORS.DANGER[500]}
          />
          <Text>Almost exceeded</Text>
        </HStack>
      )} */}
      {budgetStatus()}
    </Box>
  );
};

export default MonthlyBudgetCategory;
