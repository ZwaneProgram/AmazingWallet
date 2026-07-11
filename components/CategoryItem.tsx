import React from "react";
import { Box, HStack, Pressable, Text } from "native-base";
import { useWindowDimensions } from "react-native";
import { Category } from "../interfaces/Category";
import { renderCategoryIcon } from "../utils/categoryIcons";
import COLORS from "../colors";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { useAccent } from "../hooks/useAccent";

interface CategoryItemProps {
  category: Category;
  selectCategory?: (e: string) => void;
  selectedCategory?: string;
  disabled: boolean;
}

const CategoryItem: React.FC<CategoryItemProps> = ({
  category,
  selectCategory,
  selectedCategory,
  disabled,
}) => {
  const user: any = useSelector((state: RootState) => state.user);
  const isDark = user.theme === "dark";
  const accent = useAccent();
  const { width } = useWindowDimensions();

  const { name, color, icon } = category;

  const isSelected = selectedCategory === name;

  // Two columns that always fit the screen with a gutter, capped on tablets.
  // Replaces the old fixed 175px + marginX which overflowed the 50% cell and
  // clipped the right-column cards / truncated labels.
  const cardWidth = Math.min((width - 72) / 2, 260);

  // Selected = filled accent tint + accent border + accent label, so a chosen
  // card reads as "this one is picked" rather than a subtle on/off toggle.
  const selectedBg = isDark ? "rgba(52,211,153,0.18)" : "#ecfdf5";
  const selectedText = isDark ? COLORS.EMERALD[300] : COLORS.EMERALD[500];

  return (
    <Pressable
      disabled={disabled}
      onPress={() => selectCategory!(name)}
      _pressed={{ opacity: 0.4 }}
      width={`${cardWidth}px`}
      onStartShouldSetResponder={() => true}
      borderColor={isSelected ? COLORS.EMERALD[400] : isDark ? "transparent" : "muted.100"}
      borderWidth={isSelected ? 2 : isDark ? 0 : 1.5}
      bg={isSelected ? selectedBg : "muted.50"}
      style={{
        height: 64,
        justifyContent: "center",
        shadowColor: isSelected ? COLORS.EMERALD[400] : "#171717",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isSelected ? 0.25 : 0.1,
        shadowRadius: isSelected ? 6 : 4,
      }}
      borderRadius={20}
      px={2.5}>
      <HStack space={2.5} alignItems="center" justifyContent="flex-start">
        <Box
          width="40px"
          height="40px"
          backgroundColor={color || accent[700]}
          borderRadius={14}
          justifyContent="center"
          alignItems="center">
          {renderCategoryIcon(icon, name, 22, COLORS.MUTED[50])}
        </Box>
        <Text
          fontFamily="SourceBold"
          numberOfLines={1}
          style={{ flex: 1 }}
          fontSize={15}
          color={isSelected ? selectedText : undefined}>
          {name}
        </Text>
      </HStack>
    </Pressable>
  );
};

export default CategoryItem;
