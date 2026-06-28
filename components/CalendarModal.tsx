import React, { useEffect, useState } from "react";
import { Modal, VStack, HStack, Box, Text, Pressable } from "native-base";
import { TouchableOpacity } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import moment from "moment";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { useAccent } from "../hooks/useAccent";

type Mode = "single" | "range";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode?: Mode;
  // single mode
  value?: string;
  onSelect?: (date: string) => void;
  // range mode
  startValue?: string;
  endValue?: string;
  onSelectRange?: (start: string, end: string) => void;
  // bounds (inclusive), YYYY-MM-DD
  minDate?: string;
  maxDate?: string;
  title?: string;
}

const FMT = "YYYY-MM-DD";
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Lightweight pure-JS calendar (works on web + Expo Go — no native datetimepicker).
// Used for back-dating new entries (single) and the History range filter (range).
const CalendarModal: React.FC<Props> = ({
  isOpen,
  onClose,
  mode = "single",
  value,
  onSelect,
  startValue,
  endValue,
  onSelectRange,
  minDate,
  maxDate,
  title,
}) => {
  const user: any = useSelector((state: RootState) => state.user);
  const isDark = user.theme === "dark";
  const accent = useAccent();

  // The month currently shown in the grid.
  const [cursor, setCursor] = useState<moment.Moment>(moment(value || maxDate || undefined));
  // Range selection, built up as the user taps (start first, then end).
  const [rangeStart, setRangeStart] = useState<string | undefined>(startValue);
  const [rangeEnd, setRangeEnd] = useState<string | undefined>(endValue);

  useEffect(() => {
    if (!isOpen) return;
    setCursor(moment(value || startValue || maxDate || undefined));
    setRangeStart(startValue);
    setRangeEnd(endValue);
  }, [isOpen]);

  const isDisabled = (d: moment.Moment) => {
    const s = d.format(FMT);
    if (minDate && s < minDate) return true;
    if (maxDate && s > maxDate) return true;
    return false;
  };

  const handleDay = (d: moment.Moment) => {
    if (isDisabled(d)) return;
    const s = d.format(FMT);
    if (mode === "single") {
      onSelect?.(s);
      onClose();
      return;
    }
    // range: first tap sets start (clears end); second tap sets end (orders them).
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(s);
      setRangeEnd(undefined);
      return;
    }
    let start = rangeStart;
    let end = s;
    if (end < start) [start, end] = [end, start];
    setRangeStart(start);
    setRangeEnd(end);
    onSelectRange?.(start, end);
    onClose();
  };

  // Build the 6-week grid for the cursor's month.
  const startOfGrid = cursor.clone().startOf("month").startOf("week");
  const days: moment.Moment[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(startOfGrid.clone().add(i, "day"));
  }

  const inSelectedRange = (s: string) =>
    mode === "range" && rangeStart && rangeEnd && s >= rangeStart && s <= rangeEnd;
  const isEndpoint = (s: string) =>
    s === value || s === rangeStart || s === rangeEnd;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Content maxWidth="360px" width="92%" bg={isDark ? "#1f2937" : "white"}>
        <Modal.Body>
          <VStack space={3}>
            <HStack alignItems="center" justifyContent="space-between">
              <Text fontFamily="SourceBold" fontSize={17}>
                {title ?? (mode === "range" ? "Pick a date range" : "Pick a date")}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <AntDesign name="close" size={22} color={isDark ? "#ffffff" : "#262626"} />
              </TouchableOpacity>
            </HStack>

            {mode === "range" && (
              <Text fontFamily="SourceSansPro" fontSize={13} color="muted.400">
                {rangeStart
                  ? rangeEnd
                    ? `${moment(rangeStart).format("MMM D")} – ${moment(rangeEnd).format("MMM D")}`
                    : `From ${moment(rangeStart).format("MMM D")} — pick an end date`
                  : "Tap a start date"}
              </Text>
            )}

            {/* Month nav */}
            <HStack alignItems="center" justifyContent="space-between">
              <Pressable
                onPress={() => setCursor((c) => c.clone().subtract(1, "month"))}
                p={2}
                _pressed={{ opacity: 0.5 }}>
                <AntDesign name="left" size={18} color={isDark ? "#ffffff" : "#262626"} />
              </Pressable>
              <Text fontFamily="SourceBold" fontSize={16}>
                {cursor.format("MMMM YYYY")}
              </Text>
              <Pressable
                onPress={() => setCursor((c) => c.clone().add(1, "month"))}
                p={2}
                _pressed={{ opacity: 0.5 }}>
                <AntDesign name="right" size={18} color={isDark ? "#ffffff" : "#262626"} />
              </Pressable>
            </HStack>

            {/* Weekday header */}
            <HStack>
              {WEEKDAYS.map((w) => (
                <Box key={w} flex={1} alignItems="center">
                  <Text fontFamily="SourceBold" fontSize={12} color="muted.400">
                    {w}
                  </Text>
                </Box>
              ))}
            </HStack>

            {/* 6 weeks */}
            <VStack space={1}>
              {Array.from({ length: 6 }, (_, week) => (
                <HStack key={week}>
                  {days.slice(week * 7, week * 7 + 7).map((d) => {
                    const s = d.format(FMT);
                    const otherMonth = d.month() !== cursor.month();
                    const disabled = isDisabled(d);
                    const endpoint = isEndpoint(s);
                    const ranged = inSelectedRange(s);
                    return (
                      <Pressable
                        key={s}
                        flex={1}
                        alignItems="center"
                        onPress={() => handleDay(d)}
                        disabled={disabled}>
                        <Box
                          width="34px"
                          height="34px"
                          borderRadius={17}
                          alignItems="center"
                          justifyContent="center"
                          style={{
                            backgroundColor: endpoint
                              ? accent[700]
                              : ranged
                              ? isDark
                                ? "#374151"
                                : accent[100]
                              : "transparent",
                          }}>
                          <Text
                            fontFamily={endpoint ? "SourceBold" : "SourceSansPro"}
                            fontSize={14}
                            color={
                              endpoint
                                ? "#ffffff"
                                : disabled
                                ? "muted.300"
                                : otherMonth
                                ? "muted.400"
                                : isDark
                                ? "#ffffff"
                                : "#262626"
                            }>
                            {d.date()}
                          </Text>
                        </Box>
                      </Pressable>
                    );
                  })}
                </HStack>
              ))}
            </VStack>

            {mode === "single" && (
              <Pressable
                onPress={() => {
                  onSelect?.(moment().format(FMT));
                  onClose();
                }}
                py={2}
                alignItems="center"
                _pressed={{ opacity: 0.6 }}>
                <Text fontFamily="SourceBold" fontSize={15} color={accent[700]}>
                  Today
                </Text>
              </Pressable>
            )}
          </VStack>
        </Modal.Body>
      </Modal.Content>
    </Modal>
  );
};

export default CalendarModal;
