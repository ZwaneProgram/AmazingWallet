-- Wallet groups (#11). Run ONCE in the Supabase SQL editor. Lets a user organise
-- wallets under named groups (e.g. a "Bank" group holding one wallet per bank).
-- Grouping is optional: wallets with group_id NULL are "Ungrouped". Deleting a
-- group ungroups its wallets (ON DELETE SET NULL) — it never deletes wallets.
-- Idempotent and non-destructive.

create table if not exists wallet_groups (
  id          serial primary key,
  user_id     integer references users(id) on delete cascade,
  name        text not null,
  color       text,
  icon        text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table wallet_groups disable row level security;

alter table wallets
  add column if not exists group_id integer
  references wallet_groups(id) on delete set null;
