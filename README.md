# AmazingWallet

A personal **expense & income tracker** built with React Native, TypeScript, NativeBase, Supabase and Redux. Runs on the web and on mobile via Expo.

## About
AmazingWallet helps you take control of your finances effortlessly. Create an account, track spending across categories, manage multiple wallets, visualize where your money goes, set monthly budgets, and review your financial habits month by month.

## Key Features
* Sign Up / Sign In
* Multiple wallets — keep cash, bank, and more separate
* Add expenses & income, organized by category (with sub-categories)
* Transaction history with edit & delete
* Pie chart to visualize spending patterns
* Monthly budgets with per-category roll-up to help you avoid overspending
* Month / year picker to browse past periods
* Multi-currency support
* Light & dark theme

## Tech Stack
* **React Native + Expo** (SDK 56, React 19)
* **TypeScript**
* **NativeBase** for UI
* **Redux Toolkit** for state
* **Supabase** for the backend / database

## Getting Started
```bash
npm install
npx expo start -c   # press "w" for web, or scan the QR in Expo Go
```

Create a `.env` file (gitignored) with:
```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
FREECURRENCY_API_KEY=...
HASH_WARNING=false
```
Environment values are baked in at build time, so restart with `npx expo start -c` after editing `.env`.
