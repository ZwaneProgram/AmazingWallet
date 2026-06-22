-- AmazingWallet — multiple wallets. Run ONCE in the Supabase SQL editor.
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
--
-- Reconciled 2026-06-21 against the LIVE production functions (captured via
-- pg_get_functiondef). Only the RPCs the app actually calls need wallet scoping:
--   * get_month_expenses  -> Home + Settings (must keep production's exact output columns)
--   * get_user_budgets    -> UserService.getUserBudgets
--   * get_wallet_summaries-> all-wallets overview screen (brand new)
--
-- INTENTIONALLY LEFT UNTOUCHED (dead in the app — verified no live caller):
--   * get_today_total / get_month_total  -> totals are computed client-side in the
--     Redux selectors from the already-wallet-scoped get_month_expenses data.
--   * get_top_spendings  -> getTopSpendingCategories() is never imported; the UI's
--     top-spending list comes from topSpedingCategoriesSelector (client-side).
--   * save_user_budget   -> budgets are saved via direct monthly_budgets table writes
--     (UserService.saveUserBudgets), not this RPC.
-- Modifying them would only leave duplicate dead overloads in production for no gain.
-- If any of them is wired up later, add a wallet_id overload at that time.
--
-- Each function below changes its argument signature (adds wallet_id), which would
-- create a NEW overload alongside the old one. We DROP the old single-/no-wallet
-- signature first so production never accumulates duplicate dead functions.

-- get_month_expenses: keep production's EXACT output columns ("categoryId", "payDate")
-- so consumers reading expense.categoryId keep working; just add wallet scoping.
drop function if exists get_month_expenses(date, date, integer);
create or replace function get_month_expenses(start_month date, end_month date, user_id integer, wallet_id integer)
returns table ("categoryId" integer, name text, description text, amount float, color text, "payDate" date) as $$
begin
  return query
    select es.category_id as "categoryId", c.name, es.description, es.amount::float, c.color, es.date as "payDate"
    from expenses es
    inner join categories c on c.id = es.category_id
    where es.date >= get_month_expenses.start_month
      and es.date <= get_month_expenses.end_month
      and es.user_id = get_month_expenses.user_id
      and es.wallet_id = get_month_expenses.wallet_id;
end;
$$ language plpgsql;

-- get_user_budgets: identical to production (keeps budget::float to avoid the old
-- numeric-vs-float 400 error); add wallet scoping.
drop function if exists get_user_budgets(integer);
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

-- get_wallet_summaries: NEW — powers the all-wallets overview screen.
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
