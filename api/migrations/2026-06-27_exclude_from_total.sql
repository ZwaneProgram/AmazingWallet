-- Per-wallet "exclude from total" flag. Run ONCE in the Supabase SQL editor.
-- When true, the wallet is skipped from cross-wallet sums (All Wallets net
-- balance, Home wallet-picker total). It still shows its own numbers when viewed
-- directly. Idempotent and non-destructive.

alter table wallets add column if not exists exclude_from_total boolean not null default false;
