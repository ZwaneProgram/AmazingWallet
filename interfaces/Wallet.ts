export interface Wallet {
  id?: number;
  userId?: number;
  name: string;
  icon?: string | null;
  color?: string | null;
  isDefault?: boolean;
  overallBudget?: number | null;
  createdAt?: string;
}

export interface WalletSummary {
  walletId: number;
  name: string;
  icon: string | null;
  color: string | null;
  incomeTotal: number;
  expenseTotal: number;
  balance: number;
}
