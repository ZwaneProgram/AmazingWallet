-- Overall (no-category) budget per wallet. Run ONCE in the Supabase SQL editor.
-- Adds a single nullable column; idempotent and non-destructive.

alter table wallets add column if not exists overall_budget numeric;
