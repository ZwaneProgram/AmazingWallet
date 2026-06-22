# Multiple Wallets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user split expenses, incomes, and budgets into named wallets (grouping labels), switch the active wallet from the Home header, and view an all-wallets overview.

**Architecture:** Each transaction-bearing table (`expenses`, `incomes`, `monthly_budgets`) gets a `wallet_id`. Aggregation RPCs gain a `wallet_id` filter. Redux holds an `activeWalletId` and a `wallets` list; Home fetches only the active wallet's rows so existing selectors keep working unchanged. New UI: an Actionsheet wallet switcher, a Manage Wallets screen (mirrors `CategoryManagerScreen`), and a read-only all-wallets overview screen.

**Tech Stack:** React Native / Expo SDK 56, React 19, native-base 3.4.28, Redux Toolkit + redux-persist, @supabase/supabase-js v2, moment.

## Global Constraints

- **No native-base `Select` / `react-native-picker-select`** — both crash on React 19 web. All pickers use native-base **Actionsheet** or a custom `Pressable` modal.
- **Custom auth, RLS disabled** — anon key; new tables must `disable row level security`.
- **Do not modify production Supabase without explicit user action.** SQL is written to a migration file; the **user** runs it in the Supabase SQL editor. The wallets table + `wallet_id` columns + backfill were already run on 2026-06-21; the RPC changes in Task 1 still need to be run.
- **No automated test suite.** Babel/Metro ignore TS errors; `tsc --noEmit` shows known baseline noise (native-base `JSX` namespace, `FlatList` TS2786, AntDesign icon-name literals). Per-task verification = `npx tsc --noEmit` and confirm **no new** errors in touched files, then a manual web check (`npx expo start` → `w`), then commit.
- **Env baked at build time** — after any `.env` change, restart `npx expo start -c` (no `.env` change expected in this plan).
- **Default wallet name:** `"Cash"`. **Currency conversion stays user-wide** (no `wallet_id`).

---

### Task 1: Database migration (RPCs + summaries) & constants

**Files:**
- Create: `api/migrations/2026-06-21_multiple_wallets.sql`
- Modify: `constants/Tables.ts`
- Modify: `constants/PostgresFunctions.ts`

**Interfaces:**
- Produces: table name constant `WALLETS = "wallets"`; function name constant `GET_WALLET_SUMMARIES = "get_wallet_summaries"`. RPCs `get_today_total`, `get_month_total`, `get_month_expenses`, `get_top_spendings`, `get_user_budgets` now accept a `wallet_id integer` arg; `save_user_budget` accepts `wallet_id integer`; new `get_wallet_summaries(user_id, start_month, end_month)` returns `(wallet_id, name, icon, color, income_total, expense_total, balance)`.

- [ ] **Step 1: Capture the current RPC definitions (user-run, safety)**

Ask the user to run this in the Supabase SQL editor and paste the output, so the rewrites in Step 2 modify the real function bodies rather than reconstructed ones:

```sql
select pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_today_total','get_month_total','get_month_expenses',
                    'get_top_spendings','get_user_budgets','save_user_budget');
```

Reconcile each captured body with the target SQL in Step 2 — keep the existing column list / return shape, add only the `wallet_id` argument and the `and <table>.wallet_id = <fn>.wallet_id` filter. If a captured body differs from the reconstruction below, the captured body wins for everything except the added `wallet_id` pieces.

- [ ] **Step 2: Write the migration SQL file**

Create `api/migrations/2026-06-21_multiple_wallets.sql`:

```sql
-- ExpenseZen — multiple wallets. Run ONCE in the Supabase SQL editor.
-- Part A (table + columns + backfill) was already run 2026-06-21 and is idempotent.
-- Part B (RPCs) is the new part to run.

-- ===== Part A: schema (idempotent) =====
create table if not exists wallets (
  id         serial primary key,
  user_id    integer references users(id) on delete cascade,
  name       text not null,
  icon       text,
  color      text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
alter table wallets disable row level security;

alter table expenses        add column if not exists wallet_id integer references wallets(id) on delete cascade;
alter table incomes         add column if not exists wallet_id integer references wallets(id) on delete cascade;
alter table monthly_budgets add column if not exists wallet_id integer references wallets(id) on delete cascade;

insert into wallets (user_id, name, is_default)
  select id, 'Cash', true from users
  where not exists (select 1 from wallets w where w.user_id = users.id);

update expenses        e set wallet_id = (select w.id from wallets w where w.user_id = e.user_id and w.is_default limit 1) where wallet_id is null;
update incomes         i set wallet_id = (select w.id from wallets w where w.user_id = i.user_id and w.is_default limit 1) where wallet_id is null;
update monthly_budgets b set wallet_id = (select w.id from wallets w where w.user_id = b.user_id and w.is_default limit 1) where wallet_id is null;

-- ===== Part B: RPCs (the new part) =====

create or replace function get_today_total(user_id integer, wallet_id integer)
returns float as $$
  select coalesce(sum(e.amount), 0)::float
  from expenses e
  where e.user_id = get_today_total.user_id
    and e.wallet_id = get_today_total.wallet_id
    and e.date = current_date;
$$ language sql;

create or replace function get_month_total(start_month date, end_month date, user_id integer, wallet_id integer)
returns float as $$
  select coalesce(sum(e.amount), 0)::float
  from expenses e
  where e.user_id = get_month_total.user_id
    and e.wallet_id = get_month_total.wallet_id
    and e.date between get_month_total.start_month and get_month_total.end_month;
$$ language sql;

create or replace function get_month_expenses(start_month date, end_month date, user_id integer, wallet_id integer)
returns table (id integer, category_id integer, name text, description text, amount float, color text, "payDate" date) as $$
  select e.id, e.category_id, c.name, e.description, e.amount::float, c.color, e.date
  from expenses e
  inner join categories c on c.id = e.category_id
  where e.user_id = get_month_expenses.user_id
    and e.wallet_id = get_month_expenses.wallet_id
    and e.date between get_month_expenses.start_month and get_month_expenses.end_month;
$$ language sql;

create or replace function get_top_spendings(user_id integer, start_month date, end_month date, wallet_id integer)
returns table (name text, amount float, color text, id integer) as $$
  select c.name, sum(e.amount)::float as amount, c.color, c.id
  from expenses e
  inner join categories c on c.id = e.category_id
  where e.user_id = get_top_spendings.user_id
    and e.wallet_id = get_top_spendings.wallet_id
    and e.date between get_top_spendings.start_month and get_top_spendings.end_month
  group by c.id, c.name, c.color
  order by amount desc;
$$ language sql;

create or replace function get_user_budgets(user_id integer, wallet_id integer)
returns table (budget float, category text, id integer, color text) as $$
begin
  return query
  select mb.budget::float, c.name, c.id, c.color
  from monthly_budgets mb
  inner join users u on u.id = mb.user_id
  inner join categories c on c.id = mb.category_id
  where u.id = get_user_budgets.user_id
    and mb.wallet_id = get_user_budgets.wallet_id;
end;
$$ language plpgsql;

create or replace function save_user_budget(user_id integer, wallet_id integer, category_id integer, budget numeric)
returns void as $$
begin
  if exists (
    select 1 from monthly_budgets mb
    where mb.user_id = save_user_budget.user_id
      and mb.wallet_id = save_user_budget.wallet_id
      and mb.category_id = save_user_budget.category_id
  ) then
    update monthly_budgets mb
      set budget = save_user_budget.budget
      where mb.user_id = save_user_budget.user_id
        and mb.wallet_id = save_user_budget.wallet_id
        and mb.category_id = save_user_budget.category_id;
  else
    insert into monthly_budgets (user_id, wallet_id, category_id, budget)
      values (save_user_budget.user_id, save_user_budget.wallet_id, save_user_budget.category_id, save_user_budget.budget);
  end if;
end;
$$ language plpgsql;

create or replace function get_wallet_summaries(user_id integer, start_month date, end_month date)
returns table (wallet_id integer, name text, icon text, color text,
               income_total float, expense_total float, balance float) as $$
  select
    w.id, w.name, w.icon, w.color,
    coalesce((select sum(i.amount) from incomes  i where i.wallet_id = w.id and i.date between get_wallet_summaries.start_month and get_wallet_summaries.end_month), 0)::float as income_total,
    coalesce((select sum(e.amount) from expenses e where e.wallet_id = w.id and e.date between get_wallet_summaries.start_month and get_wallet_summaries.end_month), 0)::float as expense_total,
    (coalesce((select sum(i.amount) from incomes  i where i.wallet_id = w.id and i.date between get_wallet_summaries.start_month and get_wallet_summaries.end_month), 0)
   - coalesce((select sum(e.amount) from expenses e where e.wallet_id = w.id and e.date between get_wallet_summaries.start_month and get_wallet_summaries.end_month), 0))::float as balance
  from wallets w
  where w.user_id = get_wallet_summaries.user_id
  order by w.is_default desc, w.id asc;
$$ language sql;
```

> The exact return-column names of `get_month_expenses` / `get_user_budgets` / `get_top_spendings` must match the originals captured in Step 1 (e.g. the existing code maps `payDate`/`name`/`color`). Adjust the reconstruction to the captured shape if they differ.

- [ ] **Step 3: Add the constants**

In `constants/Tables.ts`, add:

```ts
export const WALLETS = "wallets";
```

In `constants/PostgresFunctions.ts`, add:

```ts
export const GET_WALLET_SUMMARIES = "get_wallet_summaries";
```

- [ ] **Step 4: User runs Part B in Supabase**

Ask the user to copy **Part B** of `2026-06-21_multiple_wallets.sql` into the Supabase SQL editor and run it. Confirm no errors. (Part A already ran.)

- [ ] **Step 5: Verify & commit**

Run: `npx tsc --noEmit` — Expected: no new errors in `constants/Tables.ts` or `constants/PostgresFunctions.ts`.

```bash
git add api/migrations/2026-06-21_multiple_wallets.sql constants/Tables.ts constants/PostgresFunctions.ts
git commit -m "feat(wallets): db migration for wallet_id RPCs + summaries, add constants"
```

---

### Task 2: Wallet interface + WalletService + interface columns

**Files:**
- Create: `interfaces/Wallet.ts`
- Create: `api/services/WalletService.ts`
- Modify: `interfaces/Expense.ts`, `interfaces/Income.ts`, `interfaces/Budget.ts`
- Modify: `constants/PostgresFunctions.ts` (reuse `GET_WALLET_SUMMARIES` from Task 1)

**Interfaces:**
- Consumes: `WALLETS`, `GET_WALLET_SUMMARIES` (Task 1); existing `supabase`, `UserService` hashing.
- Produces: `Wallet` interface `{ id?, userId?, name, icon?, color?, isDefault?, createdAt? }`; `WalletService.{ getUserWallets(userId) , createWallet(input), updateWallet(id, fields), deleteWallet(id, opts), seedDefaultWallet(userId), getWalletSummaries(userId, start, end) }`; `WalletSummary` type `{ walletId, name, icon, color, incomeTotal, expenseTotal, balance }`.

- [ ] **Step 1: Create `interfaces/Wallet.ts`**

```ts
export interface Wallet {
  id?: number;
  userId?: number;
  name: string;
  icon?: string | null;
  color?: string | null;
  isDefault?: boolean;
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
```

- [ ] **Step 2: Add `walletId` to the three interfaces**

In `interfaces/Expense.ts` add `walletId?: number;`. In `interfaces/Income.ts` add `walletId?: number;`. In `interfaces/Budget.ts` add `walletId?: number;`.

- [ ] **Step 3: Create `api/services/WalletService.ts`**

```ts
import { supabase } from "../supabase";
import { WALLETS } from "../../constants/Tables";
import { GET_WALLET_SUMMARIES } from "../../constants/PostgresFunctions";
import { Wallet, WalletSummary } from "../../interfaces/Wallet";
import { UserService } from "./UserService";

const mapWallet = (row: any): Wallet => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  icon: row.icon ?? null,
  color: row.color ?? null,
  isDefault: row.is_default ?? false,
  createdAt: row.created_at,
});

const getUserWallets = async (userId: number): Promise<Wallet[]> => {
  try {
    const { data, error } = await supabase
      .from(WALLETS)
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("id", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapWallet);
  } catch (error) {
    console.log("getUserWallets failed:", error);
    return [];
  }
};

const createWallet = async (input: {
  userId: number;
  name: string;
  icon?: string | null;
  color?: string | null;
}): Promise<Wallet> => {
  const { data, error } = await supabase
    .from(WALLETS)
    .insert({
      user_id: input.userId,
      name: input.name,
      icon: input.icon ?? null,
      color: input.color ?? null,
      is_default: false,
    })
    .select()
    .single();
  if (error) throw error;
  return mapWallet(data);
};

const updateWallet = async (
  id: number,
  fields: { name: string; icon?: string | null; color?: string | null }
): Promise<void> => {
  const { error } = await supabase
    .from(WALLETS)
    .update({ name: fields.name, icon: fields.icon ?? null, color: fields.color ?? null })
    .eq("id", id);
  if (error) throw error;
};

const setDefaultWallet = async (userId: number, walletId: number): Promise<void> => {
  const clear = await supabase.from(WALLETS).update({ is_default: false }).eq("user_id", userId);
  if (clear.error) throw clear.error;
  const set = await supabase.from(WALLETS).update({ is_default: true }).eq("id", walletId);
  if (set.error) throw set.error;
};

// Counts rows that belong to a wallet, to decide empty vs. password-gated delete.
const walletHasData = async (walletId: number): Promise<boolean> => {
  const tables = ["expenses", "incomes", "monthly_budgets"];
  for (const t of tables) {
    const { count, error } = await supabase
      .from(t)
      .select("id", { count: "exact", head: true })
      .eq("wallet_id", walletId);
    if (error) throw error;
    if ((count ?? 0) > 0) return true;
  }
  return false;
};

// Deletes a wallet. Guards: cannot delete the last wallet; non-empty wallets require a
// correct account password. Promotes another wallet to default if the deleted one was default.
const deleteWallet = async (
  id: number,
  opts: { userId: number; email: string; password?: string }
): Promise<{ ok: boolean; reason?: "last-wallet" | "needs-password" | "bad-password" }> => {
  const wallets = await getUserWallets(opts.userId);
  if (wallets.length <= 1) return { ok: false, reason: "last-wallet" };

  const hasData = await walletHasData(id);
  if (hasData) {
    if (!opts.password) return { ok: false, reason: "needs-password" };
    const valid = await UserService.verifyPassword(opts.email, opts.password);
    if (!valid) return { ok: false, reason: "bad-password" };
  }

  const target = wallets.find((w) => w.id === id);
  const { error } = await supabase.from(WALLETS).delete().eq("id", id);
  if (error) throw error;

  if (target?.isDefault) {
    const next = wallets.find((w) => w.id !== id);
    if (next?.id) await setDefaultWallet(opts.userId, next.id);
  }
  return { ok: true };
};

const seedDefaultWallet = async (userId: number): Promise<Wallet> => {
  const { data, error } = await supabase
    .from(WALLETS)
    .insert({ user_id: userId, name: "Cash", is_default: true })
    .select()
    .single();
  if (error) throw error;
  return mapWallet(data);
};

const getWalletSummaries = async (
  userId: number,
  startOfMonth: string,
  endOfMonth: string
): Promise<WalletSummary[]> => {
  try {
    const { data, error } = await supabase.rpc(GET_WALLET_SUMMARIES, {
      user_id: userId,
      start_month: startOfMonth,
      end_month: endOfMonth,
    });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      walletId: row.wallet_id,
      name: row.name,
      icon: row.icon ?? null,
      color: row.color ?? null,
      incomeTotal: row.income_total ?? 0,
      expenseTotal: row.expense_total ?? 0,
      balance: row.balance ?? 0,
    }));
  } catch (error) {
    console.log("getWalletSummaries failed:", error);
    return [];
  }
};

export const WalletService = {
  getUserWallets,
  createWallet,
  updateWallet,
  setDefaultWallet,
  deleteWallet,
  seedDefaultWallet,
  getWalletSummaries,
};
```

- [ ] **Step 4: Add `UserService.verifyPassword`**

Open `api/services/UserService.ts` and locate the existing login/hash logic (it already hashes passwords for `registerUser`). Add a `verifyPassword(email, password)` that fetches the user's stored hash and compares using the **same** hashing/compare the login path uses (reuse the existing bcrypt/compare import already in the file — do not introduce a new hashing lib). Export it on the `UserService` object:

```ts
// adapt the compare call to the hashing already used in this file (e.g. bcrypt.compareSync)
const verifyPassword = async (email: string, password: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from(USERS)
      .select("password")
      .filter("email", "eq", email)
      .single();
    if (error || !data?.password) return false;
    return comparePassword(password, data.password); // use this file's existing compare helper
  } catch {
    return false;
  }
};
```

Add `verifyPassword` to the exported `UserService` object.

- [ ] **Step 5: Verify & commit**

Run: `npx tsc --noEmit` — Expected: no new errors in the created/modified files. (If `verifyPassword`'s compare helper name differs, fix to match the file.)

```bash
git add interfaces/Wallet.ts interfaces/Expense.ts interfaces/Income.ts interfaces/Budget.ts api/services/WalletService.ts api/services/UserService.ts
git commit -m "feat(wallets): Wallet interface, WalletService, verifyPassword"
```

---

### Task 3: Redux — activeWalletId + wallets list

**Files:**
- Modify: `redux/userReducer.ts`
- Modify: `redux/expensesReducers.ts`

**Interfaces:**
- Produces: `state.user.activeWalletId: number`; action `setActiveWalletAction(id)`. `state.expenses.wallets: Wallet[]`; action `setWalletsAction(wallets)`.

- [ ] **Step 1: userReducer — add activeWalletId**

In `redux/userReducer.ts`: add `activeWalletId: number;` to `initalStateProps`, `activeWalletId: 0` to `initialState`, a reducer `setActiveWallet: (state, action) => { state.activeWalletId = action.payload; }`, and export `export const setActiveWalletAction = userReducer.actions.setActiveWallet;`. Also clear it in `removeUser` (`state.activeWalletId = 0;`).

- [ ] **Step 2: expensesReducers — add wallets list**

In `redux/expensesReducers.ts`: import `Wallet` from `../interfaces/Wallet`; add `wallets: Wallet[];` to `initialStateProps` and `wallets: []` to `initialState`; add reducer `setWallets: (state, action) => { state.wallets = action.payload; }`; export `export const setWalletsAction = expensesReducer.actions.setWallets;`. Add a selector:

```ts
export const walletsSelector = createSelector([generalState], (expenses: any) => expenses.wallets);
```

- [ ] **Step 3: Verify & commit**

Run: `npx tsc --noEmit` — Expected: no new errors.

```bash
git add redux/userReducer.ts redux/expensesReducers.ts
git commit -m "feat(wallets): redux activeWalletId + wallets list"
```

---

### Task 4: Thread walletId through services & Home fetch

**Files:**
- Modify: `api/services/ExpenseService.ts`
- Modify: `api/services/IncomeService.ts`
- Modify: `api/services/UserService.ts` (getUserBudgets caller of `get_user_budgets`)
- Modify: `screens/HomeScreen.tsx`

**Interfaces:**
- Consumes: RPCs with `wallet_id` (Task 1); `setWalletsAction`, `setActiveWalletAction`, `walletsSelector` (Task 3); `WalletService.getUserWallets` (Task 2).
- Produces: `ExpenseService.AddExpense` and `getMonthExpenses` take `walletId`; `IncomeService.addIncome`/`getMonthIncomes` take `walletId`; `UserService.getUserBudgets(userId, walletId)`.

- [ ] **Step 1: ExpenseService — walletId**

In `api/services/ExpenseService.ts`: `AddExpense` reads `walletId` off the `Expense` arg and inserts `wallet_id: walletId`. `getMonthExpenses(userId, startOfMonth, endOfMonth, walletId)` passes `wallet_id: walletId` in the `GET_MONTH_EXPENSES` rpc params.

```ts
const getMonthExpenses = async (userId: number, startOfMonth: string, endOfMonth: string, walletId: number) => {
  try {
    const { data } = await supabase.rpc(GET_MONTH_EXPENSES, {
      start_month: startOfMonth,
      end_month: endOfMonth,
      user_id: userId,
      wallet_id: walletId,
    });
    return data;
  } catch (error) {
    if (error instanceof Error) console.log(error);
  }
};
```

And in `AddExpense`'s insert object add `wallet_id: expense.walletId`.

- [ ] **Step 2: IncomeService — walletId**

In `api/services/IncomeService.ts`: `addIncome` inserts `wallet_id: income.walletId`. `getMonthIncomes(userId, startOfMonth, endOfMonth, walletId)` adds `.eq("wallet_id", walletId)` to the query chain (incomes are fetched by direct query, not an RPC).

- [ ] **Step 3: UserService.getUserBudgets — walletId**

In `api/services/UserService.ts`, the function that calls the `GET_USER_BUDGETS` rpc: change signature to `getUserBudgets(userId, walletId)` and pass `wallet_id: walletId` in the rpc params alongside `user_id`.

- [ ] **Step 4: HomeScreen — load wallets, scope fetches by active wallet**

In `screens/HomeScreen.tsx`:
- Read `const activeWalletId = user.activeWalletId;` and `const wallets = useSelector(walletsSelector);`.
- In `getGeneralInfo`, before fetching, ensure wallets are loaded and an active wallet is set:

```ts
const allWallets = await WalletService.getUserWallets(user.id);
dispatch(setWalletsAction(allWallets));
let walletId = user.activeWalletId;
if (!walletId || !allWallets.some((w) => w.id === walletId)) {
  const def = allWallets.find((w) => w.isDefault) ?? allWallets[0];
  walletId = def?.id ?? 0;
  dispatch(setActiveWalletAction(walletId));
}
```

- Pass `walletId` into `getMonthlyExpenses(user.id, startOfMonth, endOfMonth, walletId)`, `getMonthlyIncomes(..., walletId)`, and `getMonthlyBudgets` → `UserService.getUserBudgets(userId, walletId)`.
- In `applyPeriod`, pass `user.activeWalletId` to the same expense/income fetches.
- Add imports for `WalletService`, `setWalletsAction`, `setActiveWalletAction`, `walletsSelector`.

- [ ] **Step 5: Verify & commit**

Run: `npx tsc --noEmit` — Expected: no new errors. Then `npx expo start` → `w`, log in, confirm Home still shows the (default-wallet) totals/budgets exactly as before.

```bash
git add api/services/ExpenseService.ts api/services/IncomeService.ts api/services/UserService.ts screens/HomeScreen.tsx
git commit -m "feat(wallets): scope expense/income/budget fetches by active wallet"
```

---

### Task 5: AddExpenseScreen + EditBudgetsScreen scoping

**Files:**
- Modify: `screens/AddExpenseScreen.tsx`
- Modify: `screens/EditBudgetsScreen.tsx`

**Interfaces:**
- Consumes: `user.activeWalletId`, `walletsSelector`, updated `ExpenseService.AddExpense`, `IncomeService.addIncome`, `UserService.getUserBudgets`, `save_user_budget` caller.

- [ ] **Step 1: AddExpenseScreen — tag new rows + label**

In `screens/AddExpenseScreen.tsx`: read `const activeWalletId = useSelector((s: RootState) => s.user.activeWalletId);` and the active wallet name from `walletsSelector`. When building the expense/income to save, set `walletId: activeWalletId`. Add a small label above the form: `Adding to: {activeWalletName}`.

- [ ] **Step 2: EditBudgetsScreen — scope to active wallet**

In `screens/EditBudgetsScreen.tsx`: read `activeWalletId` + active wallet name. Pass `walletId` to the `save_user_budget` rpc call (params `{ user_id, wallet_id, category_id, budget }`) and to the budgets reload (`UserService.getUserBudgets(userId, activeWalletId)`). Show the wallet name in the header/title (e.g. `Budgets · {walletName}`).

- [ ] **Step 3: Verify & commit**

Run: `npx tsc --noEmit` — Expected: no new errors. Manual: add an expense, confirm it appears on Home; edit a budget, confirm it persists for the active wallet.

```bash
git add screens/AddExpenseScreen.tsx screens/EditBudgetsScreen.tsx
git commit -m "feat(wallets): tag new transactions and scope budgets to active wallet"
```

---

### Task 6: Seed default wallet on registration

**Files:**
- Modify: `api/services/UserService.ts`

**Interfaces:**
- Consumes: `WalletService.seedDefaultWallet` (Task 2).

- [ ] **Step 1: Seed in registerUser**

In `api/services/UserService.ts` `registerUser`, right after the existing `seedDefaultCategories(created.id)` call (inside the same `if (created?.id)` block), add:

```ts
await WalletService.seedDefaultWallet(created.id);
```

Import `WalletService` at top (note: `WalletService` imports `UserService` for `verifyPassword` — this is a mutual import; both are object exports resolved at call time, so it's safe, but if Metro complains about a cycle, inline the `verifyPassword` query in WalletService instead).

- [ ] **Step 2: Verify & commit**

Run: `npx tsc --noEmit` — Expected: no new errors. Manual (optional): register a throwaway account, confirm it lands on Home with a "Cash" wallet and default categories.

```bash
git add api/services/UserService.ts
git commit -m "feat(wallets): seed default Cash wallet for new accounts"
```

---

### Task 7: Wallet switcher (Home header Actionsheet)

**Files:**
- Create: `components/WalletPickerSheet.tsx`
- Modify: `screens/HomeScreen.tsx`

**Interfaces:**
- Consumes: `walletsSelector`, `user.activeWalletId`, `setActiveWalletAction`, `categoryIcons` (`utils/categoryIcons.tsx`), navigation.
- Produces: `<WalletPickerSheet isOpen onClose wallets activeWalletId onSelect onManage onOverview />`.

- [ ] **Step 1: Create `components/WalletPickerSheet.tsx`**

Use native-base `Actionsheet` (the same component the currency picker uses in `SettingsScreen`). Render one `Actionsheet.Item` per wallet (icon via `categoryIcons`, name, check on the active one) plus two footer items "All wallets overview" and "Manage wallets":

```tsx
import { Actionsheet, HStack, Text, Icon } from "native-base";
import { AntDesign } from "@expo/vector-icons";
import { Wallet } from "../interfaces/Wallet";
import { getCategoryIcon } from "../utils/categoryIcons";
import COLORS from "../colors";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  activeWalletId: number;
  onSelect: (walletId: number) => void;
  onManage: () => void;
  onOverview: () => void;
}

const WalletPickerSheet: React.FC<Props> = ({
  isOpen, onClose, wallets, activeWalletId, onSelect, onManage, onOverview,
}) => (
  <Actionsheet isOpen={isOpen} onClose={onClose}>
    <Actionsheet.Content>
      {wallets.map((w) => (
        <Actionsheet.Item
          key={w.id}
          onPress={() => { onSelect(w.id!); onClose(); }}
          startIcon={getCategoryIcon(w.icon ?? "wallet", 22, w.color ?? COLORS.PURPLE[700])}
          endIcon={
            w.id === activeWalletId
              ? <Icon as={AntDesign} name="check" size={5} color="purple.700" />
              : undefined
          }>
          {w.name}
        </Actionsheet.Item>
      ))}
      <Actionsheet.Item onPress={() => { onOverview(); onClose(); }}>
        <HStack space={2} alignItems="center">
          <Icon as={AntDesign} name="bars" size={5} color="muted.500" />
          <Text>All wallets overview</Text>
        </HStack>
      </Actionsheet.Item>
      <Actionsheet.Item onPress={() => { onManage(); onClose(); }}>
        <HStack space={2} alignItems="center">
          <Icon as={AntDesign} name="setting" size={5} color="muted.500" />
          <Text>Manage wallets</Text>
        </HStack>
      </Actionsheet.Item>
    </Actionsheet.Content>
  </Actionsheet>
);

export default WalletPickerSheet;
```

> Confirm `utils/categoryIcons.tsx` exports a helper that returns a JSX icon for a key (used by `CategoryItem`/`CategoryManagerScreen`). If its name isn't `getCategoryIcon`, use the actual exported name and signature. If a wallet has no icon, fall back to AntDesign `"wallet"`.

- [ ] **Step 2: Add the switcher pill + sheet to HomeScreen header**

In `screens/HomeScreen.tsx`: add `const [walletSheetOpen, setWalletSheetOpen] = useState(false);`. In the header `VStack` (next to the month/year pill at line ~96), add a `Pressable` pill showing the active wallet name + caret that calls `setWalletSheetOpen(true)`. Render `<WalletPickerSheet ... />` near the `MonthYearPickerModal` at the bottom of the component:

```tsx
<WalletPickerSheet
  isOpen={walletSheetOpen}
  onClose={() => setWalletSheetOpen(false)}
  wallets={wallets}
  activeWalletId={user.activeWalletId}
  onSelect={(walletId) => {
    dispatch(setActiveWalletAction(walletId));
    applyPeriod(user.month, selectedYear); // refetch for the newly selected wallet
  }}
  onManage={() => navigation.navigate("ManageWallets")}
  onOverview={() => navigation.navigate("WalletsOverview")}
/>
```

Adjust `applyPeriod` so it reads the wallet id from `getState`/argument at call time (it already refetches expenses/incomes; ensure it uses the just-selected `walletId`). Simplest: have `applyPeriod` accept an optional `walletId` param defaulting to `user.activeWalletId`, and pass the new id from `onSelect`.

- [ ] **Step 3: Verify & commit**

Run: `npx tsc --noEmit` — Expected: no new errors. Manual: tap the wallet pill, sheet opens, switching wallets re-scopes Home. (`ManageWallets`/`WalletsOverview` routes are added in Tasks 8–9; until then those footer taps will warn — acceptable mid-plan.)

```bash
git add components/WalletPickerSheet.tsx screens/HomeScreen.tsx
git commit -m "feat(wallets): Home header wallet switcher (Actionsheet)"
```

---

### Task 8: Manage Wallets screen + navigation + Settings link

**Files:**
- Create: `screens/WalletManagerScreen.tsx`
- Modify: `navigation/StackNavigator.tsx`
- Modify: `interfaces/Navigation.ts`
- Modify: `screens/SettingsScreen.tsx`

**Interfaces:**
- Consumes: `WalletService` CRUD (Task 2), `categoryIcons`, `utils` icon picker patterns from `CategoryManagerScreen`, redux `wallets` + `activeWalletId`.

- [ ] **Step 1: Create `screens/WalletManagerScreen.tsx`**

Mirror the structure of `screens/CategoryManagerScreen.tsx` (header with back button via `navigation.goBack()`, list of items, an add/edit modal with name + icon + color pickers using `utils/categoryIcons`). Differences from the category screen:
- Items are wallets (`WalletService.getUserWallets(user.id)`), refreshed into redux via `setWalletsAction`.
- Each row has a "Set default" affordance (star/checkmark) calling `WalletService.setDefaultWallet(user.id, wallet.id)`; the default row shows a badge.
- Delete uses the guarded flow:

```ts
const handleDelete = async (wallet: Wallet) => {
  const res = await WalletService.deleteWallet(wallet.id!, {
    userId: user.id, email: user.email!,
  });
  if (res.reason === "last-wallet") { /* toast: "You need at least one wallet" */ return; }
  if (res.reason === "needs-password") { setPwModalWallet(wallet); return; } // open password modal
  await refresh();
};

// password modal confirm:
const confirmDelete = async (wallet: Wallet, password: string) => {
  const res = await WalletService.deleteWallet(wallet.id!, {
    userId: user.id, email: user.email!, password,
  });
  if (res.reason === "bad-password") { /* toast: "Wrong password" */ return; }
  if (res.ok) { setPwModalWallet(null); await refresh(); }
};
```
- The password modal is a native-base `Modal` with an `EZInput` (`type="password"`)/secure `Input` and Cancel/Delete buttons. Reuse `EZInput` from `components/shared`.
- `refresh()` reloads wallets and dispatches `setWalletsAction`; if the active wallet was deleted, dispatch `setActiveWalletAction(defaultWalletId)`.

Follow `CategoryManagerScreen`'s styling, spacing, and color/icon picker components verbatim where they apply.

- [ ] **Step 2: Register the route**

In `interfaces/Navigation.ts` add `ManageWallets: undefined;` and `WalletsOverview: undefined;` to `AppStackParamList`. In `navigation/StackNavigator.tsx`, import `WalletManagerScreen` and add (mirroring the `ManageCategories` entry):

```tsx
{ name: "ManageWallets", component: WalletManagerScreen, options: { presentation: "containedModal", headerShown: false } },
```

- [ ] **Step 3: Settings link**

In `screens/SettingsScreen.tsx`, next to the existing "Manage Categories" row (the one with `onPress: () => navigation.navigate("ManageCategories")`), add a "Manage Wallets" row with `onPress: () => navigation.navigate("ManageWallets")` (copy the adjacent row's structure/icon style).

- [ ] **Step 4: Verify & commit**

Run: `npx tsc --noEmit` — Expected: no new errors. Manual: Settings → Manage Wallets; create a wallet, rename, set default; delete an empty wallet (confirm), try deleting a wallet with data (password prompt), try deleting the last wallet (blocked).

```bash
git add screens/WalletManagerScreen.tsx navigation/StackNavigator.tsx interfaces/Navigation.ts screens/SettingsScreen.tsx
git commit -m "feat(wallets): Manage Wallets screen + nav + Settings link"
```

---

### Task 9: All Wallets overview screen

**Files:**
- Create: `screens/WalletsOverviewScreen.tsx`
- Modify: `navigation/StackNavigator.tsx`

**Interfaces:**
- Consumes: `WalletService.getWalletSummaries` (Task 2), `user.month`/`user.year`, `user.symbol`, `categoryIcons`.

- [ ] **Step 1: Create `screens/WalletsOverviewScreen.tsx`**

Read the current month range from `user.month`/`user.year` (reuse the `moment` start/end-of-month logic already in `HomeScreen`). Fetch `WalletService.getWalletSummaries(user.id, startOfMonth, endOfMonth)` in a `useEffect`. Render:
- A header with a back button (`navigation.goBack()`) and title "All Wallets".
- A total net balance card = sum of all `summary.balance`.
- A `FlatList`/`VStack` of cards, one per wallet: icon (`categoryIcons`, fallback `"wallet"`), name, `Income {symbol}{incomeTotal}`, `Expenses {symbol}{expenseTotal}`, `Balance {symbol}{balance}` (green/red like the Home balance card at `HomeScreen` lines ~228–264).

Read-only — no edit/budget controls.

- [ ] **Step 2: Register the route**

In `navigation/StackNavigator.tsx`, import `WalletsOverviewScreen` and add:

```tsx
{ name: "WalletsOverview", component: WalletsOverviewScreen, options: { presentation: "containedModal", headerShown: false } },
```

(The `WalletsOverview` param type was added in Task 8 Step 2.)

- [ ] **Step 3: Verify & commit**

Run: `npx tsc --noEmit` — Expected: no new errors. Manual: switcher → "All wallets overview"; confirm per-wallet totals and the net total match the current month.

```bash
git add screens/WalletsOverviewScreen.tsx navigation/StackNavigator.tsx
git commit -m "feat(wallets): all-wallets overview screen"
```

---

### Task 10: Final integration pass

**Files:**
- Modify (only if needed): `screens/TransactionsScreen.tsx`, `screens/SettingsScreen.tsx`, `screens/GraphScreen.tsx`

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Audit remaining `user_id`-only data paths**

Grep for callers that still need wallet scoping now that RPCs changed signature:

```bash
grep -rn "getMonthExpenses\|getMonthIncomes\|get_user_budgets\|GET_USER_BUDGETS\|save_user_budget\|getTopSpendingCategories\|GET_TOP_SPENDINGS" screens components api | grep -v node_modules
```

For each hit: if it feeds the active-wallet Home/Transactions/Graph view, pass `user.activeWalletId`. `TransactionsScreen` (history): scope its expense/income fetches to the active wallet so history matches the selected wallet. `GraphScreen` (top spendings): pass `wallet_id: user.activeWalletId` to `GET_TOP_SPENDINGS` (its signature changed in Task 1) — without this the call will error on the new arg.

- [ ] **Step 2: Erase-data path**

In `screens/SettingsScreen.tsx` "Erase data": it currently clears expenses/incomes per user — leave wallets intact (wallets are structure, not data). No change unless a TS error from the signature changes appears; if so, fix the call sites.

- [ ] **Step 3: Full verify & commit**

Run: `npx tsc --noEmit` — Expected: no new errors beyond the documented baseline. Manual smoke test: create 2nd wallet → add expense/income in each → switch wallets on Home (totals change) → per-wallet budgets independent → overview shows both → delete flows behave.

```bash
git add -A
git commit -m "feat(wallets): scope transactions/graph to active wallet; integration pass"
```

---

## Self-Review

**Spec coverage:**
- §1 concept/decisions → Tasks 1–9 (grouping labels, active wallet, per-wallet budgets, overview, default Cash, guarded delete, user-wide currency untouched). ✓
- §2 database → Task 1. ✓
- §3 RPCs + `get_wallet_summaries` → Task 1. ✓
- §4 service layer → Tasks 2, 4, 6. ✓
- §5 redux → Task 3 (+ wiring in Task 4). ✓
- §6 UI/nav (switcher, overview, manage, AddExpense, EditBudgets, nav, Settings) → Tasks 5, 7, 8, 9. ✓
- §7 web picker constraint → Global Constraints + Task 7 Actionsheet. ✓
- §8 out-of-scope → respected (no opening balances/transfers/per-wallet currency). ✓

**Placeholder scan:** No "TBD/TODO". Two flagged verification points (capture real RPC bodies in Task 1 Step 1; confirm `categoryIcons` helper name in Task 7) are deliberate codebase-reconciliation steps, not placeholders — each has a concrete fallback.

**Type consistency:** `walletId`/`wallet_id` naming consistent (camelCase in TS, snake in SQL/insert objects). `WalletService` method names match across tasks (`getUserWallets`, `seedDefaultWallet`, `deleteWallet`, `getWalletSummaries`, `setDefaultWallet`, `verifyPassword`). `setActiveWalletAction`/`setWalletsAction`/`walletsSelector` consistent between Task 3 and consumers.
