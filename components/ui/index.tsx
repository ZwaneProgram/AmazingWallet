// ui/ — small, shared "soft modern fintech" primitives.
//
// Card        — the standard rounded, softly-shadowed surface.
// Screen      — responsive page wrapper (centers a capped column on web/tablet).
// SectionHeader — bold title + optional right-side action, consistent everywhere.
// Chip        — pill (filled or translucent) for tags/filters/wallet labels.
//
// Keep these dumb and prop-driven so any screen can adopt them cheaply.

import React from "react";
import { Box, HStack, Pressable, Text, VStack } from "native-base";
import { RADII, SHADOWS, CONTENT_MAX_WIDTH } from "../../theme/designSystem";

// --- Card ---------------------------------------------------------------------

interface CardProps {
  children: React.ReactNode;
  [key: string]: any;
}

export const Card: React.FC<CardProps> = ({ children, ...rest }) => (
  <Box
    bg="muted.50"
    borderRadius={RADII.xl}
    px={5}
    py={4}
    style={SHADOWS.card as any}
    {...rest}>
    {children}
  </Box>
);

// --- Screen -------------------------------------------------------------------
// Caps and centers content so the phone UI doesn't stretch on web / tablets.

interface ScreenProps {
  children: React.ReactNode;
  px?: number | string;
  [key: string]: any;
}

export const Screen: React.FC<ScreenProps> = ({ children, px = 6, ...rest }) => (
  <Box flex={1} w="100%" alignItems="center">
    <Box w="100%" maxW={`${CONTENT_MAX_WIDTH}px`} flex={1} px={px} {...rest}>
      {children}
    </Box>
  </Box>
);

// --- SectionHeader ------------------------------------------------------------

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  actionColor?: string;
  rightElement?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionLabel,
  onAction,
  actionColor = "purple.700",
  rightElement,
}) => (
  <HStack justifyContent="space-between" alignItems="center">
    <Text fontFamily="SourceBold" fontSize={22}>
      {title}
    </Text>
    {rightElement
      ? rightElement
      : actionLabel && onAction ? (
          <Pressable onPress={onAction} _pressed={{ opacity: 0.4 }} flexShrink={0}>
            <Text fontFamily="SourceBold" color={actionColor} fontSize={15}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
  </HStack>
);

// --- Chip ---------------------------------------------------------------------

interface ChipProps {
  label: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  active?: boolean;
  // "solid" tints with accent; "glass" is translucent white (for coloured rows).
  variant?: "solid" | "glass" | "outline";
  color?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  icon,
  onPress,
  active,
  variant = "solid",
  color = "#7e22ce",
}) => {
  const bg =
    variant === "glass"
      ? "rgba(255,255,255,0.18)"
      : variant === "outline"
      ? "transparent"
      : active
      ? color
      : "rgba(126,34,206,0.10)";
  const textColor = variant === "glass" || active ? "#fff" : color;
  const borderColor = variant === "outline" ? color : "transparent";

  const inner = (
    <HStack
      alignItems="center"
      space={1.5}
      px={3}
      py={1.5}
      borderRadius={RADII.pill}
      borderWidth={variant === "outline" ? 1 : 0}
      style={{ backgroundColor: bg, borderColor }}>
      {icon}
      <Text fontFamily="SourceBold" fontSize={13} style={{ color: textColor }}>
        {label}
      </Text>
    </HStack>
  );

  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} _pressed={{ opacity: 0.6 }}>
      {inner}
    </Pressable>
  );
};

// --- StatTile -----------------------------------------------------------------
// Small labeled number used in summary rows (income / spent / balance).

interface StatTileProps {
  label: string;
  value: string;
  color?: string;
  icon?: React.ReactNode;
  align?: "flex-start" | "flex-end";
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  color = "#171717",
  icon,
  align = "flex-start",
}) => (
  <VStack space={1} alignItems={align}>
    <HStack space={1} alignItems="center">
      {icon}
      <Text color="muted.400" fontFamily="SourceSansPro" fontSize={14}>
        {label}
      </Text>
    </HStack>
    <Text fontFamily="SourceBold" fontSize={20} style={{ color }}>
      {value}
    </Text>
  </VStack>
);
