import React, { useEffect, useState } from "react";
import { Modal, VStack, HStack, Box, Pressable, Text } from "native-base";
import { TouchableOpacity } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { MONTHS } from "../constants/Months";
import { RootState } from "../redux/store";
import { useAccent } from "../hooks/useAccent";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  month: string;
  year: number;
  onSelect: (month: string, year: number) => void;
  // When provided, an "All <year>" option is shown above the month grid (used by
  // History to view a whole year at once). Home/Graph omit it and behave as before.
  onSelectAll?: (year: number) => void;
  allActive?: boolean;
}

const MonthYearPickerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  month,
  year,
  onSelect,
  onSelectAll,
  allActive,
}) => {
  const isDark = useSelector((state: RootState) => state.user.theme) === "dark";
  const accent = useAccent();
  const [viewYear, setViewYear] = useState<number>(year);

  useEffect(() => {
    if (isOpen) {
      setViewYear(year);
    }
  }, [isOpen]);

  const pick = (selectedMonth: string) => {
    onSelect(selectedMonth, viewYear);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Content maxWidth="360px" width="90%" bg={isDark ? "#1f2937" : "white"}>
        <Modal.Body>
          <VStack space={4}>
            <HStack justifyContent="flex-end">
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <AntDesign name="close" size={22} color={isDark ? "#ffffff" : "#262626"} />
              </TouchableOpacity>
            </HStack>

            <HStack alignItems="center" justifyContent="space-between" px={2}>
              <TouchableOpacity
                onPress={() => setViewYear((y) => y - 1)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <AntDesign name="left" size={22} color={accent[700]} />
              </TouchableOpacity>
              <Text fontFamily="SourceBold" fontSize={22}>
                {viewYear}
              </Text>
              <TouchableOpacity
                onPress={() => setViewYear((y) => y + 1)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <AntDesign name="right" size={22} color={accent[700]} />
              </TouchableOpacity>
            </HStack>

            {onSelectAll && (
              <Pressable
                onPress={() => {
                  onSelectAll(viewYear);
                  onClose();
                }}>
                <Box
                  height="44px"
                  borderRadius={12}
                  justifyContent="center"
                  alignItems="center"
                  bg={allActive && viewYear === year ? "purple.700" : isDark ? "#374151" : "muted.100"}>
                  <Text
                    fontFamily="SourceBold"
                    fontSize={14}
                    color={allActive && viewYear === year ? "white" : "muted.700"}>
                    All {viewYear}
                  </Text>
                </Box>
              </Pressable>
            )}

            <Box flexDirection="row" flexWrap="wrap" justifyContent="space-between">
              {MONTHS.map((m) => {
                const active = !allActive && m === month && viewYear === year;
                return (
                  <Pressable key={m} width="23%" mb={3} onPress={() => pick(m)}>
                    <Box
                      height="44px"
                      borderRadius={12}
                      justifyContent="center"
                      alignItems="center"
                      bg={active ? "purple.700" : isDark ? "#374151" : "muted.100"}>
                      <Text
                        fontFamily="SourceBold"
                        fontSize={14}
                        color={active ? "white" : "muted.700"}>
                        {m.slice(0, 3)}
                      </Text>
                    </Box>
                  </Pressable>
                );
              })}
            </Box>
          </VStack>
        </Modal.Body>
      </Modal.Content>
    </Modal>
  );
};

export default MonthYearPickerModal;
