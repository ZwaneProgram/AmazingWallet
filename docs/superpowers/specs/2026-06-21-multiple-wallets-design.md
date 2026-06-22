# Multiple Wallets — Design Spec

**Date:** 2026-06-21
**Status:** Approved (design); implementation pending
**Scope:** Add multiple wallets to ExpenseZen so a user can separate transactions
(e.g. Personal vs Business) into named buckets. Largest remaining feature — touches the
database plus every expense, income, and budget flow.

---

## 1. Concept & decisions

- **A wallet is a grouping label, not a real account.** No opening balance, no transfers.
  A wallet's balance = (its incomes − its expenses) within the selected month.
- **One active wallet at a time.** A switcher in the Home header scopes everything —
  income/expense/balance, transactions, and budgets — to the selected wallet.
- **Budgets are per-wallet.** A category budget belongs to one wallet (Personal Groceries
  and Business Groceries are independent limits).
- **"All wallets" overview.** A separate read-only view shows combined data across wallets
  (total net balance + per-wallet breakdown). Reached from the switcher.
- **Default wallet.** Every user has exactly one default wallet ("Cash"). New sign-ups get
  one seeded automatically; existing users got one via the migration backfill.
- **Deletion is allowed but guarded:**
  - Empty wallet (no expenses/incomes/budgets) → simple confirm.
  - Non-empty wallet → must enter account password; on success, cascade-delete the wallet
    and its transactions.
  - Cannot delete the last remaining wallet (always keep ≥1).
  - Deleting the default wallet promotes another wallet to default.
- **Currency stays user-wide.** Currency conversion applies across all wallets (unchanged).

---

## 2. Database

### New table

```sql
create table if not exists wallets (
  id         serial primary key,
  user_id    integer references users(id) on delete cascade,
  name       text not null,
  icon       text,                              -- reuse categoryIcons keys
  color      text,                              -- accent color, like categories
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
alter table wallets disable row level security;  -- matches app's RLS-off pattern
```

### Columns added to transaction-bearing tables

```sql
alter table expenses        add column if not exists wallet_id integer references wallets(id) on delete cascade;
alter table incomes         add column if not exists wallet_id integer references wallets(id) on delete cascade;
alter table monthly_budgets add column if not exists wallet_id integer references wallets(id) on delete cascade;
```

`on delete cascade` is the DB backstop behind the app-level password-gated delete.

### One-time backfill (already applied to production 2026-06-21)

```sql
insert into wallets (user_id, name, is_default)
  select id, 'Cash', true from users;

update expenses        e set wallet_id = (select w.id from wallets w where w.user_id = e.user_id and w.is_default limit 1) where wallet_id is null;
update incomes         i set wallet_id = (select w.id from wallets w where w.user_id = i.user_id and w.is_default limit 1) where wallet_id is null;
update monthly_budgets b set wallet_id = (select w.id from wallets w where w.user_id = b.user_id and w.is_default limit 1) where wallet_id is null;
```

> The migration SQL lives at `api/migrations/2026-06-21_multiple_wallets.sql`.

---

## 3. Database functions (RPCs)

Each aggregation RPC gains a `wallet_id` argument and a `wallet_id =` filter:

| RPC | Change |
|---|---|
| `get_today_total` | + `wallet_id` filter |
| `get_month_total` | + `wallet_id` filter |
| `get_month_expenses` | + `wallet_id` filter |
| `get_top_spendings` | + `wallet_id` filter |
| `get_user_budgets` | + `wallet_id` filter (per-wallet budgets) |
| `save_user_budget` | + `wallet_id`; upsert key becomes (user, wallet, category) |
| `convert_*_currency` | **no change** — conversion stays user-wide |

### New RPC for the overview

```sql
get_wallet_summaries(user_id, start_month, end_month)
-- returns: wallet_id, name, icon, color, income_total, expense_total, balance
```

One call returns every wallet's monthly totals so the overview isn't N round-trips.

> RPC changes are additive (new optional/required args). The migration SQL recreates each
> function with the new signature; callers are updated in the same change.

---

## 4. Service layer

- **New `api/services/WalletService.ts`:**
  `getUserWallets`, `createWallet`, `updateWallet`, `deleteWallet`
  (password-verify + last-wallet guard + default-promotion), `seedDefaultWallet`,
  `getWalletSummaries`.
- **`ExpenseService` / `IncomeService`:** thread `walletId` into `AddExpense` / `addIncome`
  and the month-fetch RPCs.
- **Budget calls (`UserService.getUserBudgets`, `save_user_budget` caller):** thread `walletId`.
- **`UserService.registerUser`:** seed a default "Cash" wallet alongside default categories.

---

## 5. Redux / state

- **`userReducer`:** add `activeWalletId` (persisted via redux-persist, like `month`/`year`).
  New action `setActiveWalletAction`. Set to the user's default wallet on login.
- **`expensesReducers`:** add `wallets` array + `setWalletsAction` (feeds the switcher).
- **Selectors unchanged.** Home fetches only the active wallet's rows (RPCs filter by
  `wallet_id`), so `monthTotalSelector`, `balanceSelector`, `monthlyBudgetsSelector` keep
  working on already-scoped in-memory data.
- **Switching wallet** re-runs the existing month-change fetch path (refetch expenses /
  incomes / budgets for active wallet + current month/year).
- **"All wallets" overview** data comes from `getWalletSummaries` and lives in local screen
  state (read-only; not persisted).

---

## 6. UI & navigation

- **Wallet switcher (Home header):** a pill beside the month/year pill (icon + name + caret).
  Tapping opens an **Actionsheet** (NOT native-base `Select`/picker — those crash on React 19
  web; reuse the currency-picker Actionsheet pattern). Lists wallets with a check on the
  active one; footer rows: "All wallets overview" and "Manage wallets."
- **All Wallets overview screen:** total net balance + one card per wallet (icon, name,
  this-month income/expense, balance) from `getWalletSummaries`. Read-only, no budget section.
- **Manage Wallets screen:** mirrors `CategoryManagerScreen` (reuse patterns + `categoryIcons`).
  List, create (name + icon + color), rename/recolor, set default, delete (empty → confirm;
  non-empty → password gate). Linked from Settings (next to "Manage Categories") and the
  switcher footer.
- **`AddExpenseScreen`:** auto-tags new expense/income with `activeWalletId`; shows an
  "Adding to: <wallet>" label.
- **`EditBudgetsScreen`:** scoped to active wallet (passes `walletId` through
  `save_user_budget` / `get_user_budgets`); shows the wallet name in the header.
- **Navigation:** add `ManageWallets` + `WalletsOverview` as modal screens in
  `StackNavigator` (like `ManageCategories`); add a "Manage Wallets" row in Settings.

---

## 7. Web constraint reminder

native-base `Select` and `react-native-picker-select` both crash on React 19 web. All new
pickers (wallet switcher, etc.) must use native-base **Actionsheet** or a custom `Pressable`
modal — never a native select.

---

## 8. Out of scope (YAGNI)

- Opening balances / true account balances
- Transfers between wallets
- Per-wallet currency
- Sharing wallets between users
