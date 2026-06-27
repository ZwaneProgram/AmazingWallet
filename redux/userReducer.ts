import { createSlice } from "@reduxjs/toolkit";
import moment from "moment";
import { DEFAULT_ACCENT } from "../utils/accent";

const currentMonth = moment().format("MMMM");
const currentYear = moment().year();

interface initalStateProps {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  currency: string | null;
  symbol: string | null;
  theme: "light" | "dark";
  accentColor: string;
  month: string;
  year: number;
  activeWalletId: number;
}

const initialState: initalStateProps = {
  id: 0,
  firstName: null,
  lastName: null,
  email: null,
  currency: null,
  symbol: null,
  theme: "light",
  accentColor: DEFAULT_ACCENT,
  month: currentMonth,
  year: currentYear,
  activeWalletId: 0,
};

const userReducer = createSlice({
  name: "user",

  initialState: initialState,
  reducers: {
    setUser: (state, action) => {
      const { payload } = action;
      state.id = payload.id;
      state.firstName = payload.firstName;
      state.lastName = payload.lastName;
      state.email = payload.email;
    },
    removeUser: (state) => {
      state.id = 0;
      state.firstName = null;
      state.lastName = null;
      state.email = null;
      state.activeWalletId = 0;
    },
    setCurrency: (state, action) => {
      const { payload } = action;
      state.currency = payload.name;
      state.symbol = payload.symbol;
    },
    removeCurrency: (state) => {
      state.currency = null;
      state.symbol = null;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    setAccentColor: (state, action) => {
      state.accentColor = action.payload;
    },
    setMonth: (state, action) => {
      state.month = action.payload;
    },
    setYear: (state, action) => {
      state.year = action.payload;
    },
    setActiveWallet: (state, action) => {
      state.activeWalletId = action.payload;
    },
  },
});

export const setUser = userReducer.actions.setUser;
export const removeUser = userReducer.actions.removeUser;
export const setCurrency = userReducer.actions.setCurrency;
export const removeCurrency = userReducer.actions.removeCurrency;
export const setThemeAction = userReducer.actions.setTheme;
export const setAccentColorAction = userReducer.actions.setAccentColor;
export const setMonthAction = userReducer.actions.setMonth;
export const setYearAction = userReducer.actions.setYear;
export const setActiveWalletAction = userReducer.actions.setActiveWallet;

export default userReducer.reducer;
