export interface Income {
  id?: number;
  userId?: number;
  walletId?: number;
  amount: number;
  description?: string;
  payDate?: any;
  categoryId?: number;
  // resolved from the (shared) category for display
  name?: string;
  color?: string;
}
