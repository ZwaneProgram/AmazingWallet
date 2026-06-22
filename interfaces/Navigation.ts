import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { Expense } from "./Expense";

export type AppStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  ResetPassword: undefined;
  Tabs: undefined;
  Currency: undefined;
  CategoryExpenses: { expenses: Expense[]; name: string };
  AddExpense: undefined;
  EditBudgets: undefined;
  About: undefined;
  ChangePassword: undefined;
  ManageCategories: undefined;
  ManageWallets: undefined;
  WalletsOverview: undefined;
};

export type StackConfig = {
  name: keyof AppStackParamList;
  component: React.ComponentType<any>;
  params?: AppStackParamList[keyof AppStackParamList];
  options?: NativeStackNavigationOptions;
};
