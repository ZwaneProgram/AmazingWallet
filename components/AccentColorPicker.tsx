import React, { useEffect, useRef, useState } from "react";
import { Modal, VStack, HStack, Box, Text, Pressable } from "native-base";
import { PanResponder, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AntDesign } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { setAccentColorAction } from "../redux/userReducer";
import {
  DEFAULT_ACCENT,
  HSV,
  hexToHsv,
  hsvToHex,
  isValidHex,
  normalizeHex,
} from "../utils/accent";
import COLORS from "../colors";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const PANEL = 240; // square saturation/value panel + hue-slider width
const HUE_H = 24;

const AccentColorPicker: React.FC<Props> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const user: any = useSelector((state: RootState) => state.user);
  const isDark = user.theme === "dark";

  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(user.accentColor || DEFAULT_ACCENT));
  const [hexText, setHexText] = useState<string>(user.accentColor || DEFAULT_ACCENT);
  // Latest hsv, readable from the (once-created) PanResponder closures.
  const hsvRef = useRef<HSV>(hsv);
  // Snapshot of the accent when the picker opened, so "cancel" (backdrop / X)
  // restores it — only an explicit Apply commits.
  const original = useRef<string>(user.accentColor || DEFAULT_ACCENT);

  useEffect(() => {
    if (isOpen) {
      const current = user.accentColor || DEFAULT_ACCENT;
      original.current = current;
      const startHsv = hexToHsv(current);
      hsvRef.current = startHsv;
      setHsv(startHsv);
      setHexText(current);
    }
  }, [isOpen]);

  const currentHex = hsvToHex(hsv);

  // Single commit path: keep the ref + state + hex field in sync and live-preview
  // the accent across the whole app. Called from drags, hex input, and reset.
  const commit = (next: HSV) => {
    hsvRef.current = next;
    setHsv(next);
    const hex = hsvToHex(next);
    setHexText(hex);
    dispatch(setAccentColorAction(hex));
  };

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  const svResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => handleSV(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderMove: (e) => handleSV(e.nativeEvent.locationX, e.nativeEvent.locationY),
    })
  ).current;

  const hueResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => handleHue(e.nativeEvent.locationX),
      onPanResponderMove: (e) => handleHue(e.nativeEvent.locationX),
    })
  ).current;

  // Hoisted so the PanResponders (created once) can call them; they read the
  // latest hue/sat/val from hsvRef rather than a stale closure.
  function handleSV(x: number, y: number) {
    const s = clamp01(x / PANEL);
    const v = 1 - clamp01(y / PANEL);
    commit({ ...hsvRef.current, s, v });
  }

  function handleHue(x: number) {
    const h = clamp01(x / PANEL) * 360;
    commit({ ...hsvRef.current, h });
  }

  const onHexChange = (text: string) => {
    setHexText(text);
    if (isValidHex(text)) {
      commit(hexToHsv(normalizeHex(text)));
    }
  };

  const resetDefault = () => commit(hexToHsv(DEFAULT_ACCENT));

  const cancel = () => {
    // Restore whatever was active when we opened.
    dispatch(setAccentColorAction(original.current));
    onClose();
  };

  const apply = () => {
    dispatch(setAccentColorAction(currentHex));
    onClose();
  };

  const pureHue = hsvToHex({ h: hsv.h, s: 1, v: 1 });
  const thumbColor = "#ffffff";

  return (
    <Modal isOpen={isOpen} onClose={cancel}>
      <Modal.Content maxWidth="360px" width="90%" bg={isDark ? "#1f2937" : "white"}>
        <Modal.Body>
          <VStack space={4} alignItems="center">
            <HStack w="100%" alignItems="center" justifyContent="space-between">
              <Text fontFamily="SourceBold" fontSize={18}>
                Accent color
              </Text>
              <TouchableOpacity
                onPress={cancel}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <AntDesign name="close" size={22} color={isDark ? "#ffffff" : "#262626"} />
              </TouchableOpacity>
            </HStack>

            {/* Saturation / Value panel */}
            <View
              {...svResponder.panHandlers}
              style={{ width: PANEL, height: PANEL, borderRadius: 16, overflow: "hidden" }}>
              <View style={{ flex: 1, backgroundColor: pureHue }} />
              <LinearGradient
                colors={["#ffffff", "rgba(255,255,255,0)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                pointerEvents="none"
                style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
              />
              <LinearGradient
                colors={["rgba(0,0,0,0)", "#000000"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                pointerEvents="none"
                style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
              />
              {/* selection ring */}
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: thumbColor,
                  backgroundColor: currentHex,
                  left: hsv.s * PANEL - 10,
                  top: (1 - hsv.v) * PANEL - 10,
                }}
              />
            </View>

            {/* Hue slider */}
            <View
              {...hueResponder.panHandlers}
              style={{ width: PANEL, height: HUE_H, borderRadius: HUE_H / 2, overflow: "hidden" }}>
              <LinearGradient
                colors={[
                  "#ff0000",
                  "#ffff00",
                  "#00ff00",
                  "#00ffff",
                  "#0000ff",
                  "#ff00ff",
                  "#ff0000",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                pointerEvents="none"
                style={{ flex: 1 }}
              />
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: -2,
                  width: HUE_H + 4,
                  height: HUE_H + 4,
                  borderRadius: (HUE_H + 4) / 2,
                  borderWidth: 3,
                  borderColor: thumbColor,
                  backgroundColor: pureHue,
                  left: (hsv.h / 360) * PANEL - (HUE_H + 4) / 2,
                }}
              />
            </View>

            {/* Preview + hex input */}
            <HStack w={`${PANEL}px`} space={3} alignItems="center">
              <Box width="44px" height="44px" borderRadius={12} style={{ backgroundColor: currentHex }} />
              <Box
                flex={1}
                flexDirection="row"
                alignItems="center"
                borderWidth={1}
                borderColor={isDark ? "#374151" : "muted.200"}
                borderRadius={12}
                px={3}>
                <Text fontFamily="SourceBold" fontSize={16} color="muted.400">
                  #
                </Text>
                <TextInput
                  value={hexText.replace("#", "")}
                  onChangeText={(t) => onHexChange(t)}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={6}
                  placeholder="7e22ce"
                  placeholderTextColor={COLORS.MUTED[400]}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    fontFamily: "SourceBold",
                    fontSize: 16,
                    color: isDark ? "#ffffff" : "#262626",
                  }}
                />
              </Box>
            </HStack>

            <HStack w={`${PANEL}px`} space={3}>
              <Pressable
                flex={1}
                onPress={resetDefault}
                py={3}
                borderRadius={10}
                borderWidth={1}
                borderColor={isDark ? "#374151" : "muted.300"}
                alignItems="center"
                _pressed={{ opacity: 0.6 }}>
                <Text fontFamily="SourceBold" fontSize={15} color="muted.700">
                  Reset
                </Text>
              </Pressable>
              <Pressable
                flex={1}
                onPress={apply}
                py={3}
                borderRadius={10}
                alignItems="center"
                style={{ backgroundColor: currentHex }}
                _pressed={{ opacity: 0.8 }}>
                <Text fontFamily="SourceBold" fontSize={15} color="#ffffff">
                  Apply
                </Text>
              </Pressable>
            </HStack>
          </VStack>
        </Modal.Body>
      </Modal.Content>
    </Modal>
  );
};

export default AccentColorPicker;
