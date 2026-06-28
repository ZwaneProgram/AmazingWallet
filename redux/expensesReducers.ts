import { createSelector, createSlice } from "@reduxjs/toolkit";
import moment from "moment";
import { Budget } from "../interfaces/Budget";
import { Category } from "../interfaces/Category";
import { Expense } from "../interfaces/Expense";
import { Income } from "../interfaces/Income";
import { Wallet, WalletGroup } from "../interfaces/Wallet";
import { computeCategoryRollup } from "../utils/categoryRollup";
import { getPeriodRange } from "../utils/period";
import { RootState } from "./store";

const todayDate = moment().format("YYYY-MM-DD");

interface initialStateProps {
  expenses: Expense[];
  incomes: Income[];
  todayTotal: number;
  topSpendingCategories: Category[];
  categories: Category[];
  budgets: Budget[];
  wallets: Wallet[];
  walletGroups: WalletGroup[];
}

const initialState: initialStateProps = {
  expenses: [],
  incomes: [],
  todayTotal: 0,
  topSpendingCategories: [],
  categories: [],
  budgets: [],
  wallets: [],
  walletGroups: [],
};

const expensesReducer = createSlice({
  name: "expenses",
  initialState: initialState,
  reducers: {
    setExpenses: (state, action) => {
      state.expenses = action.payload;
    },

    addExpense: (state, action) => {
      state.expenses = [...state.expenses, action.payload];
    },
    updateExpense: (state, action) => {
      state.expenses = state.expenses.map((expense) =>
        expense.id === action.payload.id ? { ...expense, ...action.payload } : expense
      );
    },
    removeExpense: (state, action) => {
      state.expenses = state.expenses.filter((expense) => expense.id !== action.payload);
    },
    setIncomes: (state, action) => {
      state.incomes = action.payload;
    },
    addIncome: (state, action) => {
      state.incomes = [...state.incomes, action.payload];
    },
    updateIncome: (state, action) => {
      state.incomes = state.incomes.map((income) =>
        income.id === action.payload.id ? { ...income, ...action.payload } : income
      );
    },
    removeIncome: (state, action) => {
      state.incomes = state.incomes.filter((income) => income.id !== action.payload);
    },
    setCategories: (state, action) => {
      state.categories = action.payload;
    },
    setTopSpedingCategories: (state, action) => {
      state.topSpendingCategories = action.payload;
    },
    setBudgets: (state, action) => {
      state.budgets = action.payload;
    },
    setWallets: (state, action) => {
      state.wallets = action.payload;
    },
    setWalletGroups: (state, action) => {
      state.walletGroups = action.payload;
    },
    editBudgets: (state, action) => {
      let budgets = action.payload;

      state.budgets = state.budgets.map((budget) => {
        const budgetToEdit = budgets.find((item: Budget) => item.category === budget.category);

        if (budgetToEdit) {
          return {
            ...budget,
            budget: budgetToEdit.budget,
          };
        } else {
          return budget;
        }
      });

      let budgetsToAdd: Budget[] = budgets.filter((item: any) => {
        const existentBudget = state.budgets.find((budget) => budget.category === item.category);

        if (!existentBudget) {
          return true;
        } else {
          return false;
        }
      });

      if (budgetsToAdd && budgetsToAdd.length > 0) {
        state.budgets = [...state.budgets, ...budgetsToAdd];
      }
    },
  },
});

//actions
export const setExpensesAction = expensesReducer.actions.setExpenses;
export const addExpenseAction = expensesReducer.actions.addExpense;
export const updateExpenseAction = expensesReducer.actions.updateExpense;
export const removeExpenseAction = expensesReducer.actions.removeExpense;
export const setIncomesAction = expensesReducer.actions.setIncomes;
export const addIncomeAction = expensesReducer.actions.addIncome;
export const updateIncomeAction = expensesReducer.actions.updateIncome;
export const removeIncomeAction = expensesReducer.actions.removeIncome;
export const setCategoriesAction = expensesReducer.actions.setCategories;
export const setBudgetsAction = expensesReducer.actions.setBudgets;
export const editBudgetsAction = expensesReducer.actions.editBudgets;
export const setWalletsAction = expensesReducer.actions.setWallets;
export const setWalletGroupsAction = expensesReducer.actions.setWalletGroups;

//selectors
const generalState = (state: RootState) => state.expenses;
const globalState = (state: RootState) => state;

export const todayTotalSelector = createSelector([generalState], (expenses: any) => {
  return expenses.expenses
    .filter((expense: Expense) => expense.payDate === todayDate)
    .reduce((accumulator: any, currentValue: Expense) => accumulator + currentValue.amount, 0);
});

export const monthTotalSelector = createSelector([globalState], (globalState: any) => {
  const currentMonth = globalState.user.month;
  const currentYear = globalState.user.year || moment().year();
  const cycleStartDay = globalState.user.cycleStartDay || 1;
  const parsedMonth = moment(currentMonth, "MMMM");
  if (parsedMonth.isValid()) {
    const { start: startOfMonth, end: endOfMonth } = getPeriodRange(
      currentMonth,
      currentYear,
      cycleStartDay
    );
    return globalState.expenses.expenses
      .filter(
        (expense: Expense) => expense.payDate >= startOfMonth && expense.payDate <= endOfMonth
      )
      .reduce((accumulator: any, currentValue: Expense) => accumulator + currentValue.amount, 0);
  }
});

export const categoriesSelector = createSelector([generalState], (expenses: any) => {
  return expenses.categories;
});

export const topSpedingCategoriesSelector = createSelector([generalState], (expenses: any) => {
  const topSpendingCategories = expenses.expenses.reduce((accumulator: any, expense: any) => {
    const categoryName = expense.name;
    const existingCategory = accumulator.find((item: any) => item.name === categoryName);

    if (!existingCategory) {
      const { color, id } = expenses.categories.find(
        (item: Category) => item.name === categoryName
      );
      accumulator.push({
        name: categoryName,
        amount: expense.amount,
        color,
        id,
      });
    } else {
      existingCategory.amount += expense.amount;
    }

    return accumulator;
  }, []);

  return topSpendingCategories.sort((a: Category, b: Category) => b.amount! - a.amount!);
});

export const monthlyBudgetsSelector = createSelector([generalState], (expenses: any) => {
  return expenses.budgets;
});

// Rolls month expenses up the 2-level category tree: each parent gets its own direct spend
// plus the spend of all its sub-categories. Pure client-side; powers Graph, Home budget cards,
// and the hierarchical budget view. Shares its implementation with the Graph screen via
// computeCategoryRollup so both stay in sync.
export const categoryRollupSelector = createSelector([generalState], (state: any) =>
  computeCategoryRollup(state.expenses as Expense[], state.categories as Category[])
);

export const walletsSelector = createSelector([generalState], (expenses: any) => expenses.wallets);

export const walletGroupsSelector = createSelector(
  [generalState],
  (expenses: any) => expenses.walletGroups
);

export const monthIncomeTotalSelector = createSelector([globalState], (globalState: any) => {
  const currentMonth = globalState.user.month;
  const currentYear = globalState.user.year || moment().year();
  const cycleStartDay = globalState.user.cycleStartDay || 1;
  const parsedMonth = moment(currentMonth, "MMMM");
  if (parsedMonth.isValid()) {
    const { start: startOfMonth, end: endOfMonth } = getPeriodRange(
      currentMonth,
      currentYear,
      cycleStartDay
    );
    return globalState.expenses.incomes
      .filter((income: Income) => income.payDate >= startOfMonth && income.payDate <= endOfMonth)
      .reduce((accumulator: number, currentValue: Income) => accumulator + currentValue.amount, 0);
  }
  return 0;
});

export const balanceSelector = createSelector(
  [monthTotalSelector, monthIncomeTotalSelector],
  (expenseTotal: number, incomeTotal: number) => {
    return (incomeTotal || 0) - (expenseTotal || 0);
  }
);

export default expensesReducer.reducer;
