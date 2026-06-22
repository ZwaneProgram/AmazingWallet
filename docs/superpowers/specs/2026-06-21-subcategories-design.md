# Sub-categories that actually do something — design

**Date:** 2026-06-21
**Status:** Approved (design)
**Author:** ZwaneProgram + Claude

## Problem

Sub-categories already exist in the data model (`categories.parent_id`), but `parentId` is only
used in two places: visual grouping in the Category manager, and cascade-delete. Everywhere that
matters — the Add Expense picker, budgets, and the Graph — a sub-category is treated as a separate
flat category. So a sub is functionally identical to a top-level category and provides no value.

## Goal

Make the 2-level category hierarchy meaningful across three flows the user picked:
1. **Roll-up reporting** — a parent's total includes its own expenses + all its subs'.
2. **2-level picker** — when adding an expense, pick a parent, then optionally a sub.
3. **Hierarchical budgets** — set one budget on the parent; "spent" rolls up its subs.

## Non-goals (YAGNI)

- No deeper nesting than 2 levels (parent → sub). No sub-sub-categories.
- No DB schema change (`parent_id` already exists; reporting is computed client-side).
- No new Postgres RPC. Roll-up is done in Redux selectors from already-loaded month data.
- No migration of existing budgets; pre-existing sub-level budget rows are left intact but ignored
  in the budget UI.

## Constraints (from project)

- React Native + Expo SDK 56, React 19, native-base 3.4.28 (fragile on web), Redux Toolkit, Supabase
  (custom auth, anon key, RLS off).
- No automated test framework: verify with `tsc --noEmit` on touched files + manual web check
  (`npx expo start` → `w`).
- This is a multi-wallet-sized feature → build/typecheck output read **raw** (no squeez).
- native-base pickers must use Pressable/Actionsheet/Modal (no `Select`).

## Model & definitions

- **Parent category:** `parentId == null`.
- **Sub-category:** `parentId === <a parent's id>`.
- **Effective (rolled-up) total** of a parent for the active wallet + month:
  `directTotal (expenses whose categoryId === parent.id) + Σ subTotals (expenses whose categoryId ∈ childrenOf(parent))`.
- An expense MAY be tagged to a parent directly OR to a sub. Both are valid.
- All roll-up is per active wallet + selected month (same scoping the rest of Home/Graph already use).

## Section 1 — Selectors (`redux/expensesReducers.ts`)

Add a `categoryRollupSelector` (memoized) that returns, for the current `expenses` slice:

```
type SubTotal   = { id; name; color; total };
type ParentRollup = {
  id; name; color;
  directTotal;            // expenses tagged directly to the parent
  subTotals: SubTotal[];  // each sub with > 0 (sorted desc)
  effectiveTotal;         // directTotal + Σ subTotals
};
```

Implementation: build a `categoryById` map and a `parentIdOf(categoryId)` lookup from
`state.expenses.categories`. Walk `expenses`, attributing each expense's amount to its parent
(itself if it is a parent) and, when it belongs to a sub, also to that sub's bucket. Return parents
sorted by `effectiveTotal` desc. Categories with zero spend are omitted from reporting views (but
all parents still appear in pickers/budgets).

Keep the existing `topSpedingCategoriesSelector` working (or re-implement Graph on top of the new
selector) — Graph is the main consumer.

## Section 2 — Add Expense 2-level picker (`AddExpenseScreen.tsx`, `components/CategoryItem.tsx`)

- Render **parent** chips first (current grid, but parents only).
- Tapping a parent that **has subs** expands a second row beneath it: the parent itself as a
  selectable chip ("Food & Drink") followed by its sub chips. Tapping a parent with **no subs**
  selects it directly (today's behavior).
- Selection still resolves to a single category (parent or sub); the existing name-based submit path
  (`categories.find(name)`) is preserved since names are unique per user.
- Validation unchanged: a category must be selected for expenses.

## Section 3 — Reporting

**Graph (`screens/GraphScreen.tsx`):**
- Drive the chart/list from `categoryRollupSelector`: one row per parent showing `effectiveTotal`.
- Each parent row is tappable to **expand/collapse** its `subTotals` breakdown (indented rows).
- Parents with no subs render as a single flat row.

**Home (`screens/HomeScreen.tsx`):**
- `getCategoryMonthlyTotal(category)` rolls subs into the parent (uses the rollup, not a flat
  name match), so the per-category budget cards reflect rolled-up spend.

## Section 4 — Budgets (`EditBudgetsScreen.tsx`, `MonthlyBudgetItem.tsx`, Home Monthly Budget)

- **Edit Budgets:** show budget inputs for **parents only**. Subs are not shown as budget rows
  (they roll up into the parent). The existing Overall budget input stays at the top.
- **Spent vs cap:** a parent budget card's spent value = its `effectiveTotal` (rolled up).
- Saving writes the budget to the parent category row (existing `saveUserBudgets` path, unchanged).
- Pre-existing budget rows on sub-categories are not displayed or edited here; left in the DB,
  ignored by the UI (harmless).

## Edge cases

- Parent with no subs → behaves exactly as today across all flows.
- Deleting a parent → cascade-deletes its subs (already implemented).
- An expense tagged to a sub whose parent was deleted → orphan; treated as its own row (defensive:
  if `parentIdOf` finds no parent, attribute to the category itself).
- Switching wallet/month → rollup recomputes from the reloaded slice (no extra fetch).

## Verification

- `npx tsc --noEmit` on touched files (raw output).
- Manual web check: add expenses to a parent and to its subs; confirm Graph shows the parent total
  and expands to the right sub breakdown; set a parent budget and confirm Home shows rolled-up
  spent vs cap; confirm a no-sub category still works everywhere.

## Touched files

- `redux/expensesReducers.ts` (new selector; possibly refactor `topSpedingCategoriesSelector`)
- `screens/AddExpenseScreen.tsx`, `components/CategoryItem.tsx`
- `screens/GraphScreen.tsx`
- `screens/EditBudgetsScreen.tsx`, `components/MonthlyBudgetItem.tsx`
- `screens/HomeScreen.tsx` (`getCategoryMonthlyTotal` roll-up)
