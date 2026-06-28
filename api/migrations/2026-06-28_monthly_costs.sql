-- Monthly costs (recurring expenses/income). Run ONCE in the Supabase SQL editor.
-- Each item repeats every calendar month on `day_of_month`. The app reminds you
-- on/after that day and you confirm payment (it never silently posts). Paying
-- creates a normal expense/income transaction and stamps `last_paid_period`
-- (YYYY-MM) so it won't nag again that month. Idempotent, non-destructive.

create table if not exists monthly_costs (
  id               serial primary key,
  user_id          integer references users(id) on delete cascade,
  wallet_id        integer references wallets(id) on delete cascade,
  type             text not null default 'expense',      -- 'expense' | 'income'
  category_id      integer references categories(id) on delete set null,
  amount           float not null,
  name             text not null,
  day_of_month     integer not null default 1,           -- 1..28
  active           boolean not null default true,
  last_paid_period text,                                 -- 'YYYY-MM' of last paid month
  snooze_until     date,                                 -- 'remind tomorrow' marker
  created_at       timestamptz not null default now()
);
alter table monthly_costs disable row level security;
alter table monthly_costs drop constraint if exists monthly_costs_day_range;
alter table monthly_costs add constraint monthly_costs_day_range
  check (day_of_month between 1 and 28);
