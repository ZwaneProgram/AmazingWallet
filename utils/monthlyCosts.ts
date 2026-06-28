import moment from "moment";
import { MonthlyCost } from "../interfaces/MonthlyCost";
import { Category } from "../interfaces/Category";
import { ExpenseService } from "../api/services/ExpenseService";
import { IncomeService } from "../api/services/IncomeService";
import { MonthlyCostService } from "../api/services/MonthlyCostService";
import { addExpenseAction, addIncomeAction } from "../redux/expensesReducers";

export type CostStatus = "paid" | "due" | "upcoming";

// Calendar-month key the "paid this month" check is stamped against. Decoupled
// from the custom billing cycle on purpose — "the 15th" means the calendar 15th.
export const currentPeriodKey = (ref: moment.Moment = moment()) => ref.format("YYYY-MM");

export const isPaidThisPeriod = (cost: MonthlyCost): boolean =>
  cost.lastPaidPeriod === currentPeriodKey();

// Due = active, not yet paid this month, the due day has arrived, and not
// snoozed for today. Snoozing ("remind tomorrow") sets snoozeUntil to today, so
// it reappears the next day and keeps nagging until paid.
export const isDue = (cost: MonthlyCost, ref: moment.Moment = moment()): boolean => {
  if (cost.active === false) return false;
  if (isPaidThisPeriod(cost)) return false;
  if (ref.date() < cost.dayOfMonth) return false;
  if (cost.snoozeUntil && ref.format("YYYY-MM-DD") <= cost.snoozeUntil) return false;
  return true;
};

export const costStatus = (cost: MonthlyCost, ref: moment.Moment = moment()): CostStatus => {
  if (isPaidThisPeriod(cost)) return "paid";
  if (ref.date() >= cost.dayOfMonth) return "due";
  return "upcoming";
};

// Date this month's instance is due (used for "next due" labels).
export const dueDateLabel = (cost: MonthlyCost, ref: moment.Moment = moment()): string => {
  const thisMonth = ref.clone().date(cost.dayOfMonth);
  const target = isPaidThisPeriod(cost) ? thisMonth.add(1, "month") : thisMonth;
  return target.format("MMM D");
};

// Pay an item: create the matching transaction (so it flows into every total and
// History, editable/deletable), then stamp it paid for this month. Dispatches the
// Redux add only when the cost is on the active wallet, so Home's current-wallet
// totals update instantly without polluting them with another wallet's entry.
export const payMonthlyCost = async (
  cost: MonthlyCost,
  categories: Category[],
  dispatch: (action: any) => void,
  activeWalletId: number
): Promise<void> => {
  const today = moment().format("YYYY-MM-DD");
  const cat = (categories ?? []).find((c) => c.id === cost.categoryId);
  const onActiveWallet = cost.walletId === activeWalletId;

  if (cost.type === "income") {
    const created = await IncomeService.addIncome({
      userId: cost.userId,
      amount: cost.amount,
      description: cost.name,
      walletId: cost.walletId,
      categoryId: cost.categoryId ?? undefined,
      payDate: today,
    });
    if (onActiveWallet) {
      dispatch(
        addIncomeAction({
          id: created.id,
          userId: cost.userId,
          amount: cost.amount,
          description: cost.name,
          walletId: cost.walletId,
          categoryId: cost.categoryId,
          payDate: today,
          name: cat?.name,
          color: cat?.color,
        })
      );
    }
  } else {
    const created = await ExpenseService.AddExpense({
      userId: cost.userId,
      amount: cost.amount,
      categoryId: cost.categoryId ?? undefined,
      description: cost.name,
      walletId: cost.walletId,
      payDate: today,
    });
    if (onActiveWallet) {
      dispatch(
        addExpenseAction({
          id: created.id,
          userId: cost.userId,
          categoryId: cost.categoryId,
          amount: cost.amount,
          description: cost.name,
          walletId: cost.walletId,
          payDate: today,
          name: cat?.name,
          color: cat?.color,
        })
      );
    }
  }

  await MonthlyCostService.markPaid(cost.id!, currentPeriodKey());
};

export const snoozeMonthlyCost = async (cost: MonthlyCost): Promise<void> => {
  // Snooze until today -> the isDue check hides it until tomorrow.
  await MonthlyCostService.snooze(cost.id!, moment().format("YYYY-MM-DD"));
};
