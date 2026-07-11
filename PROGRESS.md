# AmazingWallet — Progress Log

> Living status doc. **When the user says "remember what we did", update this file**:
> move finished items to ✅, adjust "What's left", and bump _Last updated_.
> Last updated: **2026-06-28** (session 2)

## What this app is
Personal **expense & income tracker**. React Native + Expo (SDK 54), Supabase backend
(custom auth, anon key, RLS off). Runs on **web** (`npx expo start` → `w`) and **Expo Go**.
Repo: https://github.com/ZwaneProgram/AmazingWallet · branch **`sdk-54-downgrade`**.

Conventions:
- DB changes are plain SQL in `api/migrations/`, **run manually in the Supabase SQL editor**
  (no migration runner). Restart with `npx expo start -c` after.
- Build style: skip formal spec docs, short design → build → `npx tsc --noEmit` (touched files).
  Pre-existing tsc noise to ignore: JSX namespace, `UserService(40)` registerUser, `supabase.ts` extra.

## Client roadmap (20 items) — 19/20 done
| # | Item | Status |
|---|------|--------|
| 1 | Choose which wallet to deduct/add money | ✅ (multi-wallet) |
| 2 | Income can have a category like expense | ✅ |
| 3 | Add/edit/delete categories for both income & expense | ✅ (category separation) |
| 4 | Nicer category picker (no checkmark) | ✅ (highlighted cards) |
| 5 | History shows which wallet | ✅ |
| 6 | Pick date + custom month/week start | ✅ (back-date, range filter, custom billing cycle) |
| 7 | Calculator: `%` instead of `()` | ✅ |
| 8 | Editing lets you choose wallet | ✅ |
| 9 | Graph monthly **and yearly**, other months/years | ✅ (own picker + "All <year>") |
| 10 | Bar/link to all-wallets overview | ✅ |
| 11 | Wallets grouped by category | ✅ (wallet groups) |
| 12 | Sub-categories, many per category | ✅ |
| 13 | Transfer money between wallets | ✅ |
| 14 | Custom app accent color (income/expense colors stay) | ✅ |
| 15 | **Notification-bar shortcuts** (+income/expense, history, wallet overview) | ❌ **LEFT** (needs native EAS build) |
| 16 | History grouped by date labels | ✅ |
| 17 | History month picker | ✅ |
| 18 | Search notes in history | ✅ |
| 19 | Per-wallet "exclude from total" switch | ✅ (+ "Not in total" markers) |
| 20 | All-wallets overview total available | ✅ |

## Extra features built (not on the list)
- ✅ **Monthly Costs** — recurring expense/income, due day, Settings CRUD screen,
  Home "due" card (Paid / Remind-tomorrow / Pay-early), pause toggle.
- ✅ **Expense vs income categories separated** (`categories.type`, manager tabs).
- ✅ Home hero = **THIS MONTH net** (green/red) instead of today's expenses.
- ✅ Overall-budget **colour ramp** (green→amber→red); only spent amount tinted.
- ✅ Wallet picker **collapsible group cards**; History wallet filter **syncs** the active wallet.

## Notable fixes
- ✅ Delete/edit not updating Home totals — `AddExpense`/`addIncome` now return the new `id`,
  and `getMonthExpenses` loads via table select (with `id`) so Redux reconciles.
- ✅ Dark-mode unreadable Expense/Income toggle (theme-aware `muted.50` track).
- ✅ Mobile overflow: overall-budget card, settings rows.
- ✅ DB cleanup: deduped categories (kept lowest id, repointed references).
- ✅ **Project-wide newest-on-top ordering** — added `created_at` to expenses/incomes/
  transfers; History, Home recent, and Category-detail lists sort by day then
  `created_at`; new entries (Add + monthly-cost pay) get a timestamp so they jump
  to the top instantly.
- ✅ Monthly-cost polish: income button says "Receive" not "Pay"; buttons colored
  by type (Paid=red, Received=green); active Expense tab is red; "Tomorrow" keeps
  the item as a visible reminder (no vanish, full color); fixed mobile button-overlap
  (button drops to its own line when snoozed).

## Migrations — all run ✅
`exclude_from_total`, `cycle_start_day`, `wallet_groups`, `monthly_costs`,
`category_type`, `created_at_ordering`.

## Status: 1.0 = FINAL (demo)
This repo is **AmazingWallet 1.0 final** — all 20 roadmap items done bar #15.
Possible small UI tweaks only. **2.0 will be a separate cloned repo** for the
remaining big features below.

## Deferred to 2.0 (do NOT build here)
1. **#15 — notification-bar quick-add shortcuts** (＋income/expense, history, wallet
   overview). Needs an EAS native build (can't run in Expo Go).
2. **#21 — Lend / Borrow debt tracker.** Add-screen button → "Lend" vs "Borrow"
   page (amount + person + note); a dedicated debts page split Lent / Borrowed
   (date, amount, person, note); tap to repay into/from a chosen wallet with
   partial-amount editing; settled items move to a past-debts history page.

## Housekeeping (optional, 1.0)
- Refresh stale `PROJECT_NOTES.md` (still says SDK 56 / "ExpenseZen").
- Broader mobile-responsiveness pass on new screens.
