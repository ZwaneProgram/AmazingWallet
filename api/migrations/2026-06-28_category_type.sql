-- Separate expense vs income categories. Run ONCE in the Supabase SQL editor.
-- Adds a `type` to categories so the Add screen / Monthly costs show the right
-- set. Existing rows default to 'expense'; the known income-flavoured names are
-- auto-classified to 'income'. Idempotent, non-destructive.

alter table categories add column if not exists type text not null default 'expense';
alter table categories drop constraint if exists categories_type_check;
alter table categories add constraint categories_type_check check (type in ('expense', 'income'));

update categories
  set type = 'income'
  where name in ('Salary', 'Bonus', 'Interest', 'Refund') and type <> 'income';
