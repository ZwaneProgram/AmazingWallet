-- Add created_at to transaction tables so History can order same-day entries by
-- when they were actually logged (expense/income IDs are separate sequences, so
-- an id tiebreaker mis-sorts across kinds). Run ONCE in the Supabase SQL editor.
-- Existing rows get now(); new rows get their true insert time. Idempotent.

alter table expenses         add column if not exists created_at timestamptz not null default now();
alter table incomes          add column if not exists created_at timestamptz not null default now();
alter table wallet_transfers add column if not exists created_at timestamptz not null default now();
