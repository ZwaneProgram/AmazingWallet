-- Custom billing-cycle start day per user. Run ONCE in the Supabase SQL editor.
-- 1 (default) = plain calendar month, so existing users are unaffected. A value
-- N in 2..28 makes the user's "month" run from day N to the day before N of the
-- next month (e.g. salary on the 25th -> 25th..24th). Idempotent, non-destructive.

alter table users add column if not exists cycle_start_day integer not null default 1;

-- Keep it within a day every month actually has.
alter table users drop constraint if exists users_cycle_start_day_range;
alter table users add constraint users_cycle_start_day_range
  check (cycle_start_day between 1 and 28);
