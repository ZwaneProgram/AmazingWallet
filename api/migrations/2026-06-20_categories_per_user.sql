-- AmazingWallet — per-user categories + sub-categories + custom icons
-- Covers requests #8 (manage in Settings), #9 (CRUD), #10 (sub-categories), #12 (icons).
-- Run ONCE in the Supabase SQL editor. The app expects these columns to exist.

-- 1. New columns -------------------------------------------------------------
alter table categories add column if not exists user_id   integer references users(id)      on delete cascade;
alter table categories add column if not exists parent_id integer references categories(id) on delete cascade;
alter table categories add column if not exists icon      text;

-- 2. Claim the existing default categories to your account -------------------
--    If you have exactly one user, this is correct as written.
--    Otherwise replace the sub-select with your own id, e.g.
--    set user_id = (select id from users where email = 'you@example.com')
update categories
set user_id = (select id from users order by id limit 1)
where user_id is null;

-- 3. Backfill icon keys so the original categories keep their icons ----------
update categories set icon = 'shopping-cart' where name = 'Grocery'      and icon is null;
update categories set icon = 'gas'           where name = 'Fuel'         and icon is null;
update categories set icon = 'restaurant'    where name = 'Food & Drink' and icon is null;
update categories set icon = 'tshirt'        where name = 'Clothes'      and icon is null;
update categories set icon = 'gift'          where name = 'Gifts'        and icon is null;
update categories set icon = 'airplane'      where name = 'Travel'       and icon is null;
update categories set icon = 'pill'          where name = 'Medicine'     and icon is null;
update categories set icon = 'bills'         where name = 'Bills'        and icon is null;
