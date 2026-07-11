import React, { useEffect, useState } from "react";
import { Modal, VStack, HStack, Pressable, Text, View } from "native-base";
import { Feather } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import COLORS from "../colors";
import { DEFAULT_ACCENT } from "../utils/accent";
import { evaluateExpression, formatResult } from "../utils/calculator";
import { RootState } from "../redux/store";

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: string;
  accentColor?: string;
  onResult: (value: string) => void;
}

const prettify = (expr: string) =>
  expr.replace(/\*/g, " × ").replace(/\//g, " ÷ ").replace(/-/g, " − ").replace(/\+/g, " + ");

const OPERATORS = ["+", "-", "*", "/"];

const CalculatorModal: React.FC<CalculatorModalProps> = ({
  isOpen,
  onClose,
  initialValue,
  accentColor = DEFAULT_ACCENT,
  onResult,
}) => {
  const isDark = useSelector((state: RootState) => state.user.theme) === "dark";
  const [expression, setExpression] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      const seed = (initialValue ?? "").replace(",", ".");
      setExpression(/^[0-9.]+$/.test(seed) ? seed : "");
    }
  }, [isOpen]);

  const preview = evaluateExpression(expression);

  const press = (key: string) => {
    setExpression((prev) => {
      const last = prev.slice(-1);

      if (key === "%") {
        // percent is postfix: it needs a number in front and can't double up
        if (prev === "" || OPERATORS.includes(last) || last === "%") {
          return prev;
        }
        return prev + "%";
      }

      if (OPERATORS.includes(key)) {
        if (prev === "") {
          return key === "-" ? "-" : prev; // only minus may lead
        }
        if (OPERATORS.includes(last)) {
          return prev.slice(0, -1) + key; // replace trailing operator
        }
        return prev + key;
      }

      if (key === ".") {
        // prevent a second dot in the current number
        const segment = prev.split(/[+\-*/()]/).pop() ?? "";
        if (segment.includes(".")) {
          return prev;
        }
        return prev === "" || OPERATORS.includes(last) ? prev + "0." : prev + ".";
      }

      return prev + key;
    });
  };

  const clearAll = () => setExpression("");
  const backspace = () => setExpression((prev) => prev.slice(0, -1));

  const equals = () => {
    if (preview !== null) {
      setExpression(formatResult(preview));
    }
  };

  const done = () => {
    if (preview !== null) {
      onResult(formatResult(preview));
    }
    onClose();
  };

  const Key: React.FC<{ label: any; onPress: () => void; bg?: string; color?: string; flex?: number }> = ({
    label,
    onPress,
    bg = isDark ? "#374151" : "muted.100",
    color = "muted.900",
    flex = 1,
  }) => (
    <Pressable flex={flex} onPress={onPress} _pressed={{ opacity: 0.5 }}>
      <View bg={bg} borderRadius={14} height="58px" justifyContent="center" alignItems="center">
        {typeof label === "string" ? (
          <Text fontFamily="SourceBold" fontSize={22} color={color}>
            {label}
          </Text>
        ) : (
          label
        )}
      </View>
    </Pressable>
  );

  const opBg = isDark ? "#4b5563" : "muted.200";

  return (
    <Modal isOpen={isOpen} onClose={onClose} avoidKeyboard size="lg">
      <Modal.Content maxWidth="420px" width="94%" bg={isDark ? "#1f2937" : "white"}>
        <Modal.CloseButton _icon={{ color: isDark ? "#ffffff" : "#262626" }} />
        <Modal.Body>
          <VStack space={3}>
            {/* Display */}
            <VStack bg="muted.50" borderRadius={14} px={4} py={3} minH="86px" justifyContent="center">
              <Text fontFamily="SourceSansPro" fontSize={18} color="muted.500" textAlign="right" numberOfLines={2}>
                {expression ? prettify(expression) : "0"}
              </Text>
              <Text fontFamily="SourceBold" fontSize={30} textAlign="right" color={accentColor}>
                {preview !== null ? formatResult(preview) : "—"}
              </Text>
            </VStack>

            <VStack space={2}>
              <HStack space={2}>
                <Key label="C" onPress={clearAll} bg="rose.100" color={COLORS.DANGER[500]} />
                <Key label="%" onPress={() => press("%")} bg={opBg} color={accentColor} flex={2} />
                <Key
                  label={<Feather name="delete" size={22} color={isDark ? "#fafafa" : COLORS.MUTED[900]} />}
                  onPress={backspace}
                  bg={opBg}
                />
              </HStack>
              <HStack space={2}>
                <Key label="7" onPress={() => press("7")} />
                <Key label="8" onPress={() => press("8")} />
                <Key label="9" onPress={() => press("9")} />
                <Key label="÷" onPress={() => press("/")} bg={opBg} color={accentColor} />
              </HStack>
              <HStack space={2}>
                <Key label="4" onPress={() => press("4")} />
                <Key label="5" onPress={() => press("5")} />
                <Key label="6" onPress={() => press("6")} />
                <Key label="×" onPress={() => press("*")} bg={opBg} color={accentColor} />
              </HStack>
              <HStack space={2}>
                <Key label="1" onPress={() => press("1")} />
                <Key label="2" onPress={() => press("2")} />
                <Key label="3" onPress={() => press("3")} />
                <Key label="−" onPress={() => press("-")} bg={opBg} color={accentColor} />
              </HStack>
              <HStack space={2}>
                <Key label="0" onPress={() => press("0")} />
                <Key label="." onPress={() => press(".")} />
                <Key label="=" onPress={equals} bg={opBg} color={accentColor} />
                <Key label="+" onPress={() => press("+")} bg={opBg} color={accentColor} />
              </HStack>
            </VStack>

            <Pressable onPress={done} _pressed={{ opacity: 0.7 }}>
              <View bg={accentColor} borderRadius={10} height="48px" justifyContent="center" alignItems="center">
                <Text fontFamily="SourceBold" fontSize={17} color="white">
                  Done
                </Text>
              </View>
            </Pressable>
          </VStack>
        </Modal.Body>
      </Modal.Content>
    </Modal>
  );
};

export default CalculatorModal;
