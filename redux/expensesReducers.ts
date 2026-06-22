import { createSelector, createSlice } from "@reduxjs/toolkit";
import moment from "moment";
import { Budget } from "../interfaces/Budget";
import { Category } from "../interfaces/Category";
import { Expense } from "../interfaces/Expense";
import { Income } from "../interfaces/Income";
import { Wallet } from "../interfaces/Wallet";
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
}

const initialState: initialStateProps = {
  expenses: [],
  incomes: [],
  todayTotal: 0,
  topSpendingCategories: [],
  categories: [],
  budgets: [],
  wallets: [],
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
  const parsedMonth = moment(currentMonth, "MMMM");
  if (parsedMonth.isValid()) {
    const monthNumber = parsedMonth.month();
    const startOfMonth = moment()
      .year(currentYear)
      .month(monthNumber)
      .startOf("month")
      .format("YYYY-MM-DD");
    const endOfMonth = moment()
      .year(currentYear)
      .month(monthNumber)
      .endOf("month")
      .format("YYYY-MM-DD");
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
// and the hierarchical budget view.
export const categoryRollupSelector = createSelector([generalState], (state: any) => {
  const cats: Category[] = state.categories || [];
  const byId = new Map<number, Category>();
  cats.forEach((c: Category) => {
    if (c.id != null) byId.set(c.id, c);
  });

  interface Sub {
    id: number;
    name: string;
    color?: string;
    icon?: any;
    total: number;
  }
  interface Parent {
    id: number;
    name: string;
    color?: string;
    icon?: any;
    directTotal: number;
    subTotals: Map<number, Sub>;
    effectiveTotal: number;
  }
  const parents = new Map<number, Parent>();

  const ensure = (pid: number): Parent => {
    let p = parents.get(pid);
    if (!p) {
      const pc = byId.get(pid);
      p = {
        id: pid,
        name: pc?.name ?? "Other",
        color: pc?.color,
        icon: pc?.icon,
        directTotal: 0,
        subTotals: new Map(),
        effectiveTotal: 0,
      };
      parents.set(pid, p);
    }
    return p;
  };

  (state.expenses as Expense[]).forEach((e: Expense) => {
    let catId = e.categoryId;
    if (catId == null && e.name) {
      catId = cats.find((c: Category) => c.name === e.name)?.id;
    }
    if (catId == null) return;
    const cat = byId.get(catId);
    const isSub = !!cat?.parentId;
    const pid = (isSub ? cat!.parentId! : cat?.id ?? catId) as number;
    const p = ensure(pid);
    p.effectiveTotal += e.amount;
    if (isSub && cat) {
      const sub = p.subTotals.get(cat.id!) ?? {
        id: cat.id!,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        total: 0,
      };
      sub.total += e.amount;
      p.subTotals.set(cat.id!, sub);
    } else {
      p.directTotal += e.amount;
    }
  });

  return Array.from(parents.values())
    .map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      icon: p.icon,
      directTotal: p.directTotal,
      subTotals: Array.from(p.subTotals.values()).sort((a, b) => b.total - a.total),
      effectiveTotal: p.effectiveTotal,
    }))
    .sort((a, b) => b.effectiveTotal - a.effectiveTotal);
});

export const walletsSelector = createSelector([generalState], (expenses: any) => expenses.wallets);

export const monthIncomeTotalSelector = createSelector([globalState], (globalState: any) => {
  const currentMonth = globalState.user.month;
  const currentYear = globalState.user.year || moment().year();
  const parsedMonth = moment(currentMonth, "MMMM");
  if (parsedMonth.isValid()) {
    const monthNumber = parsedMonth.month();
    const startOfMonth = moment()
      .year(currentYear)
      .month(monthNumber)
      .startOf("month")
      .format("YYYY-MM-DD");
    const endOfMonth = moment()
      .year(currentYear)
      .month(monthNumber)
      .endOf("month")
      .format("YYYY-MM-DD");
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
