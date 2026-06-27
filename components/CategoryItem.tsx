import React from "react";
import { Box, HStack, Pressable, Text } from "native-base";
import { useWindowDimensions } from "react-native";
import { Category } from "../interfaces/Category";
import { renderCategoryIcon } from "../utils/categoryIcons";
import { AntDesign } from "@expo/vector-icons";
import COLORS from "../colors";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";

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
  const { width } = useWindowDimensions();

  const { name, color, icon } = category;

  const isSelected = selectedCategory === name;

  // Two columns that always fit the screen with a gutter, capped on tablets.
  // Replaces the old fixed 175px + marginX which overflowed the 50% cell and
  // clipped the right-column cards / truncated labels.
  const cardWidth = Math.min((width - 72) / 2, 260);

  return (
    <Pressable
      disabled={disabled}
      onPress={() => selectCategory!(name)}
      _pressed={{ opacity: 0.4 }}
      width={`${cardWidth}px`}
      onStartShouldSetResponder={() => true}
      borderColor={isSelected ? COLORS.EMERALD[400] : "muted.100"}
      borderWidth={user.theme === "dark" ? 0 : 1.5}
      bg="muted.50"
      style={{
        height: 64,
        justifyContent: "center",
        shadowColor: "#171717",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }}
      borderRadius={20}
      px={2.5}>
      <HStack space={2.5} alignItems="center" justifyContent="flex-start">
        <Box
          width="40px"
          height="40px"
          backgroundColor={color || COLORS.PURPLE[700]}
          borderRadius={14}
          justifyContent="center"
          alignItems="center">
          {renderCategoryIcon(icon, name, 22, COLORS.MUTED[50])}
        </Box>
        <Text
          fontFamily="SourceBold"
          numberOfLines={1}
          style={{ flex: 1 }}
          fontSize={15}>
          {name}
        </Text>
      </HStack>
      {isSelected && (
        <Box position="absolute" right="-5px" bottom="-5px" bg="muted.100" borderRadius={20}>
          <AntDesign name="check-circle" size={24} color={COLORS.EMERALD[400]} />
        </Box>
      )}
    </Pressable>
  );
};

export default CategoryItem;
