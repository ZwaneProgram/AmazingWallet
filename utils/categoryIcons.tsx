import React from "react";
import {
  Ionicons,
  MaterialIcons,
  FontAwesome,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { getCategoryIcon } from "./getCategoryIcon";

type Renderer = (size: number, color: string) => JSX.Element;

interface IconOption {
  key: string;
  render: Renderer;
}

export const ICON_OPTIONS: IconOption[] = [
  { key: "shopping-cart", render: (s, c) => <FontAwesome name="shopping-cart" size={s} color={c} /> },
  { key: "gas", render: (s, c) => <MaterialIcons name="local-gas-station" size={s} color={c} /> },
  { key: "restaurant", render: (s, c) => <Ionicons name="restaurant" size={s} color={c} /> },
  { key: "tshirt", render: (s, c) => <MaterialCommunityIcons name="tshirt-crew" size={s} color={c} /> },
  { key: "gift", render: (s, c) => <Ionicons name="gift-sharp" size={s} color={c} /> },
  { key: "airplane", render: (s, c) => <MaterialCommunityIcons name="airplane" size={s} color={c} /> },
  { key: "pill", render: (s, c) => <MaterialCommunityIcons name="pill" size={s} color={c} /> },
  { key: "bills", render: (s, c) => <Ionicons name="newspaper-sharp" size={s} color={c} /> },
  { key: "home", render: (s, c) => <Ionicons name="home" size={s} color={c} /> },
  { key: "car", render: (s, c) => <Ionicons name="car-sport" size={s} color={c} /> },
  { key: "bus", render: (s, c) => <Ionicons name="bus" size={s} color={c} /> },
  { key: "coffee", render: (s, c) => <FontAwesome5 name="coffee" size={s} color={c} /> },
  { key: "heart", render: (s, c) => <Ionicons name="heart" size={s} color={c} /> },
  { key: "fitness", render: (s, c) => <MaterialCommunityIcons name="dumbbell" size={s} color={c} /> },
  { key: "education", render: (s, c) => <Ionicons name="school" size={s} color={c} /> },
  { key: "book", render: (s, c) => <Ionicons name="book" size={s} color={c} /> },
  { key: "game", render: (s, c) => <Ionicons name="game-controller" size={s} color={c} /> },
  { key: "music", render: (s, c) => <Ionicons name="musical-notes" size={s} color={c} /> },
  { key: "phone", render: (s, c) => <Ionicons name="phone-portrait" size={s} color={c} /> },
  { key: "wifi", render: (s, c) => <Ionicons name="wifi" size={s} color={c} /> },
  { key: "pet", render: (s, c) => <MaterialCommunityIcons name="paw" size={s} color={c} /> },
  { key: "baby", render: (s, c) => <MaterialCommunityIcons name="baby-carriage" size={s} color={c} /> },
  { key: "cash", render: (s, c) => <FontAwesome5 name="money-bill-wave" size={s} color={c} /> },
  { key: "card", render: (s, c) => <Ionicons name="card" size={s} color={c} /> },
  { key: "savings", render: (s, c) => <MaterialCommunityIcons name="piggy-bank" size={s} color={c} /> },
  { key: "tools", render: (s, c) => <Ionicons name="construct" size={s} color={c} /> },
  { key: "cart", render: (s, c) => <Ionicons name="cart" size={s} color={c} /> },
  { key: "star", render: (s, c) => <Ionicons name="star" size={s} color={c} /> },
];

const ICON_MAP: { [key: string]: Renderer } = ICON_OPTIONS.reduce((acc, option) => {
  acc[option.key] = option.render;
  return acc;
}, {} as { [key: string]: Renderer });

// Prefer an explicit DB icon key; fall back to the legacy name-based mapping
// (keeps the original default categories looking right).
export const renderCategoryIcon = (
  iconKey: string | undefined | null,
  name: string | undefined,
  size: number,
  color: string
): JSX.Element | null => {
  if (iconKey && ICON_MAP[iconKey]) {
    return ICON_MAP[iconKey](size, color);
  }
  return getCategoryIcon(name, size, color);
};

export const COLOR_PALETTE: string[] = [
  "#7e22ce",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#fe9400",
  "#eab308",
  "#10b981",
  "#34d399",
  "#14b8a6",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#64748b",
];
